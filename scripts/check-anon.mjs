// 원격 Supabase에서 비로그인(publishable 키만) 요청이 모든 데이터·함수에서 막히는지 확인한다.
// 사용: node scripts/check-anon.mjs   (.env 의 EXPO_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY 사용)
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const headers = { apikey: key, 'Content-Type': 'application/json' };

const checks = [
  ['GET', '/rest/v1/memos?select=id'],
  ['GET', '/rest/v1/memos_with_coords?select=id'],
  ['GET', '/rest/v1/memo_groups?select=id'],
  ['GET', '/rest/v1/memo_photos?select=id'],
  ['GET', '/rest/v1/group_shares?select=id'],
  ['GET', '/rest/v1/memo_promise_shares?select=id'],
  ['GET', '/rest/v1/search_usage?select=user_id'],
  ['GET', '/rest/v1/import_usage?select=user_id'],
  ['POST', '/rest/v1/rpc/create_group_share', { p_group_id: '00000000-0000-0000-0000-000000000000' }],
  ['POST', '/rest/v1/rpc/import_share_copy', { p_caller: '00000000-0000-0000-0000-000000000000', p_token: 'x'.repeat(30) }],
  ['POST', '/rest/v1/rpc/undo_share_import', { p_caller: '00000000-0000-0000-0000-000000000000', p_token: 'x'.repeat(30), p_group_id: '00000000-0000-0000-0000-000000000000' }],
  ['POST', '/rest/v1/rpc/create_promise_share', { p_memo_id: '00000000-0000-0000-0000-000000000000' }],
  ['POST', '/rest/v1/rpc/revoke_promise_share', { p_memo_id: '00000000-0000-0000-0000-000000000000' }],
  ['POST', '/storage/v1/object/list/memo-photos', { prefix: '' }],
  ['POST', '/functions/v1/import-share', { token: 'x'.repeat(30) }, { Authorization: `Bearer ${key}` }],
  ['POST', '/functions/v1/naver-search', { query: '카페' }, { Authorization: `Bearer ${key}` }],
];

let failed = 0;
for (const [method, path, body, extra] of checks) {
  const res = await fetch(url + path, { method, headers: { ...headers, ...extra }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  // 401/403 = 권한 거부. storage list 는 비로그인에게 200 + [] 로 응답할 수 있어 빈 배열도 통과로 본다.
  const blocked = res.status === 401 || res.status === 403 || (path.startsWith('/storage') && res.ok && text.trim() === '[]');
  if (!blocked) failed += 1;
  console.log(`${blocked ? 'OK  ' : 'FAIL'} ${res.status} ${method} ${path} ${blocked ? '' : text.slice(0, 120)}`);
}
console.log(failed === 0 ? 'anon checks passed' : `anon checks FAILED: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
