// 약속 링크 조회(공개). 로그인 없이 토큰만으로 열린다 → verify_jwt = false (supabase/config.toml).
// service role 로 토큰 한 건만 조회하고, 받는 사람에게 필요한 칸만 돌려준다(작성자 id·다른 메모는 절대 포함하지 않음).
import { createClient } from 'npm:@supabase/supabase-js@2';

import { isValidPromiseToken, toPromiseView, type PromiseRow } from './logic.ts';

// 웹 뷰어(정적 페이지)와 앱에서 호출한다. 응답에 쿠키·인증 정보가 없어 모든 출처를 허용해도 된다.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let token: unknown;
  try {
    token = (await req.json())?.token;
  } catch {
    return json({ error: 'INVALID_REQUEST' }, 400);
  }
  if (!isValidPromiseToken(token)) return json({ error: 'NOT_FOUND' }, 404);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: share, error: shareError } = await admin
    .from('memo_promise_shares')
    .select('memo_id')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle<{ memo_id: string }>();
  if (shareError) {
    console.error('promise-view: share lookup failed', shareError.message);
    return json({ error: 'VIEW_FAILED' }, 500);
  }
  // 없는 토큰과 꺼진 링크를 구분하지 않는다.
  if (!share) return json({ error: 'NOT_FOUND' }, 404);

  const { data: memo, error: memoError } = await admin
    .from('memos_with_coords')
    .select('title, address, body, secret_note, lat, lng, promise_start, promise_end')
    .eq('id', share.memo_id)
    .maybeSingle<PromiseRow>();
  if (memoError) {
    console.error('promise-view: memo lookup failed', memoError.message);
    return json({ error: 'VIEW_FAILED' }, 500);
  }
  if (!memo) return json({ error: 'NOT_FOUND' }, 404);

  const view = toPromiseView(memo, new Date());
  if (!view) return json({ error: 'EXPIRED' }, 410);
  return json(view);
});
