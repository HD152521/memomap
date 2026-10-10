# 메모 지도 (memo-map)

장소마다 나만의 메모(화장실 비번, 단골 카페, 먹은 메뉴…)를 남기는 개인 메모 지도 앱.

- 기획: `~/.claude/PRPs/prds/memo-map.prd.md`
- 스택: Expo SDK 57 (React Native, expo-router) · Supabase (Postgres + PostGIS, Auth, Edge Functions) · 네이버 지도 · TanStack Query · zod

## 폴더 구조

```
src/
  app/                 # expo-router 라우트 (화면만)
    _layout.tsx        # Provider + 로그인 여부로 (app)/login 분기
    login.tsx
    (app)/             # 로그인 후 화면: 지도, 검색, 메모 생성/상세
  features/<domain>/   # auth, memos, places, map — 로직·컴포넌트·테스트(__tests__)
  lib/                 # supabase 클라이언트, env 검증, AppError, logger, queryClient
  ui/                  # 공용 UI(Button, theme 토큰)
supabase/
  migrations/          # DB 스키마 (RLS 포함)
  functions/naver-search/  # 네이버 지역 검색 프록시 (Deno)
```

## 필요한 키

| 어디서 | 무엇 | 넣는 곳 |
|---|---|---|
| Supabase → Project Settings → API | Project URL, Publishable key | `.env` |
| NCP 콘솔 → NAVER API HUB → 검색(지역) | API Key ID / API Key | `supabase secrets set` (앱에 넣지 않음) |
| 카카오 개발자 → 내 애플리케이션 | REST API 키, Client Secret | Supabase → Auth → Providers → Kakao |
| Apple Developer | Sign in with Apple 활성화된 App ID `com.yongsik.memomap` | Supabase → Auth → Providers → Apple → Client IDs |

```bash
cp .env.example .env   # 값 채우기
```

## Supabase 설정 (최초 1회)

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push                       # migrations 적용
npx supabase secrets set NAVER_APIHUB_KEY_ID=... NAVER_APIHUB_KEY=...
npx supabase functions deploy naver-search
npx supabase functions deploy import-share   # 그룹 공유 가져오기(사진 복사 포함)
npx supabase functions deploy promise-view --no-verify-jwt   # 약속 링크(로그인 없이 토큰으로 조회)
npm run check:anon                           # 비로그인 접근이 전부 막혔는지 원격 확인
```

대시보드에서:
- **Auth → URL Configuration → Redirect URLs**: `memomap://auth/callback` 추가
- **Auth → Providers → Kakao**: 활성화, REST API 키 / Client Secret 입력, **Allow users without an email** 켜기 (이메일 동의는 비즈앱 전용)
- **Auth → Providers → Apple**: 활성화, Client IDs에 `com.yongsik.memomap`
- 카카오 개발자 콘솔: Redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`, 동의항목 닉네임·프로필 사진

## 약속 링크 웹 뷰어

받는 사람은 앱 없이 `web/promise/index.html`(정적 페이지)을 연다. 토큰은 URL `#` 뒤에 있어 웹 서버 로그에 남지 않는다.
앱이 만드는 주소는 `src/features/promise/promiseRepository.ts`의 `PROMISE_WEB_URL`(기본: GitHub Pages `/memomap/p/`).
이 페이지를 그 주소에 올려야 링크가 열린다. 비번은 약속 마지막 날(한국 시간)까지만 내려가고, 끝나고 30일이 지나면 링크가 만료된다.

## 실행

MapLibre 지도·Apple 로그인 네이티브 모듈 때문에 **Expo Go로는 실행되지 않는다.** 개발 빌드가 필요하다.
Android SDK 없이 EAS 클라우드로 개발용 APK를 만드는 방법:

```bash
npx eas-cli@latest login                      # Expo 계정 (무료)
npx eas-cli@latest init                       # EAS 프로젝트 연결 (app.config.ts에 projectId 추가됨)

# 빌드 시점에 필요한 공개 값 등록 (.env는 EAS로 업로드되지 않는다)
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_xxx --visibility plaintext

npx eas-cli@latest build --profile development --platform android   # 완료되면 QR/링크로 APK 설치
npx expo start --dev-client                   # PC와 폰이 같은 Wi-Fi. 설치한 앱에서 서버에 접속
```

- iOS 개발 빌드는 Apple Developer 계정($99/년)과 기기 등록(`eas device:create`)이 필요하다.
- Android Studio가 있으면 `npm run android`로 로컬 빌드도 가능.

지도는 MapLibre + OpenFreeMap(OpenStreetMap 데이터) 벡터 타일이라 키가 필요 없다. 색은 `src/features/map/mapStyle.ts`.
지도 출처 표기(ⓘ, © OpenStreetMap)는 라이선스상 숨기면 안 된다.

## 검증

```bash
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run test:db        # Docker 필요: PostGIS 컨테이너에 마이그레이션 적용 후 RLS·좌표·제약·검색 한도 검증
```

- 공유 가져오기는 사용자당 하루 50회, 공유당 메모 300개·사진 300장 상한. 행 작업은 SQL 함수 `import_share_copy`(단일 트랜잭션), 사진 파일 복사만 Edge Function.
- 네이버 검색은 사용자당 하루 300회로 제한된다 (`consume_search_quota`, 앱 전체 한도 25,000회 보호).

## 규칙

- 새 네이티브 모듈(예: expo-image-picker)을 넣으면 개발 빌드를 다시 만들어야 한다(`eas build --profile development --platform android`).
- typedRoutes는 꺼 두었다: Windows에서 dev 서버 감시가 `.expo/types/router.d.ts`를 잘못 생성한다.

- 좌표 → DB 변환은 `src/features/memos/geo.ts`의 `toEwktPoint` 한 곳에서만 (PostGIS는 경도가 먼저).
- DB 접근은 `memoRepository` → 화면은 `useMemos` 계열 훅만 사용.
- 에러는 `toAppError`로 변환해 `userMessage`를 보여준다. `console.*` 대신 `logger`.
- 새 테이블은 RLS 필수. 뷰는 `security_invoker = true`.
