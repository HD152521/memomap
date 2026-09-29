// 네이버 지역 검색 API 프록시 (NAVER API HUB). API 키를 앱에 넣지 않기 위해 서버에서 호출한다.
// 개발자센터 검색 API(openapi.naver.com)는 2026-07-31 신규 발급 종료 → NCP NAVER API HUB 키 사용. 응답 형식은 동일.
// verify_jwt는 공개 anon 키 JWT도 통과시키므로, 함수 안에서 실제 로그인 사용자인지 확인하고
// 사용자별 일일 한도(consume_search_quota)로 앱 전체 할당량 소진을 막는다.
import { createClient } from 'npm:@supabase/supabase-js@2';

const NAVER_LOCAL_URL = 'https://naverapihub.apigw.ntruss.com/search/v1/local';
const QUERY_MAX_LENGTH = 50;
const RESULT_COUNT = 5; // 지역 검색 API의 최대치
const DAILY_LIMIT_PER_USER = 300;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readQuery(req: Request): Promise<string | null> {
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    return query.length >= 1 && query.length <= QUERY_MAX_LENGTH ? query : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  // 로그인 확인을 먼저 한다: 비로그인 요청에 서버 설정 상태가 드러나지 않게.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  if (userError || !userData.user) return json({ error: 'UNAUTHORIZED' }, 401);

  const keyId = Deno.env.get('NAVER_APIHUB_KEY_ID');
  const key = Deno.env.get('NAVER_APIHUB_KEY');
  if (!keyId || !key) {
    console.error('naver-search: NAVER_APIHUB_KEY_ID / NAVER_APIHUB_KEY not set');
    return json({ error: 'SERVER_MISCONFIGURED' }, 500);
  }

  const query = await readQuery(req);
  if (!query) return json({ error: 'INVALID_QUERY' }, 400);

  const { data: allowed, error: quotaError } = await supabase.rpc('consume_search_quota', { daily_limit: DAILY_LIMIT_PER_USER });
  if (quotaError) {
    console.error('naver-search: quota check failed', quotaError.message);
    return json({ error: 'SEARCH_FAILED' }, 502);
  }
  if (!allowed) return json({ error: 'RATE_LIMITED' }, 429);

  const url = `${NAVER_LOCAL_URL}?query=${encodeURIComponent(query)}&display=${RESULT_COUNT}&sort=random`;
  try {
    const res = await fetch(url, {
      headers: { 'X-NCP-APIGW-API-KEY-ID': keyId, 'X-NCP-APIGW-API-KEY': key },
    });
    if (!res.ok) {
      console.error('naver-search: upstream error', res.status);
      return json({ error: 'SEARCH_FAILED' }, 502);
    }
    const data = await res.json();
    return json({ items: Array.isArray(data?.items) ? data.items : [] });
  } catch (e) {
    console.error('naver-search: fetch failed', e instanceof Error ? e.message : e);
    return json({ error: 'SEARCH_FAILED' }, 502);
  }
});
