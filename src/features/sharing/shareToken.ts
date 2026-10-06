// supabase/functions/import-share/logic.ts 의 SHARE_TOKEN_PATTERN 과 같은 규칙을 유지할 것.
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,64}$/;

export function isValidShareToken(token: unknown): token is string {
  return typeof token === 'string' && SHARE_TOKEN_PATTERN.test(token);
}
