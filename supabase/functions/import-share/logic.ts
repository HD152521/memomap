// import-share 의 순수 로직. Deno API를 쓰지 않아 앱 jest 테스트에서도 불러 검증한다
// (src/features/sharing/__tests__/importLogic.test.ts).

/** 앱(src/features/sharing/shareToken.ts)과 같은 규칙을 유지할 것. */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,64}$/;

/** SQL import_share_copy 의 상한과 같은 값. 사진 복사가 Edge Function 시간 제한 안에 끝나도록 작게 잡는다. */
export const MAX_MEMOS_PER_SHARE = 300;
export const MAX_PHOTOS_PER_SHARE = 300;
export const DAILY_IMPORT_LIMIT = 50;

export function isValidShareToken(token: unknown): token is string {
  return typeof token === 'string' && SHARE_TOKEN_PATTERN.test(token);
}

/** 받는 사람 폴더 아래 새 경로. Storage 정책·DB 트리거가 첫 폴더 = 소유자 id 를 요구한다. */
export function copiedPhotoPath(callerId: string, newMemoId: string, fileId: string): string {
  return `${callerId}/${newMemoId}/${fileId}.jpg`;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** SQL 함수가 올린 오류 메시지 코드 → HTTP 상태. 모르는 오류는 500. */
const ERROR_STATUS: Record<string, number> = {
  SHARE_NOT_FOUND: 404,
  NOTHING_TO_UNDO: 404,
  OWN_SHARE: 409,
  SHARE_TOO_LARGE: 413,
  RATE_LIMITED: 429,
};

export function rpcErrorToResponse(message: string | undefined): { status: number; error: string } {
  const code = Object.keys(ERROR_STATUS).find((key) => message?.includes(key));
  return code ? { status: ERROR_STATUS[code], error: code } : { status: 500, error: 'IMPORT_FAILED' };
}
