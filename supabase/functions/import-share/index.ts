// 그룹 공유 링크 가져오기 / 되돌리기.
// 행 작업(한도 차감, 이전 복사본 교체, 메모 복사)은 SQL 함수 import_share_copy / undo_share_import 가 한 트랜잭션으로 처리한다.
// 이 함수는 호출자 확인과 사진 파일 복사·정리만 맡는다. service role 키·원본 사용자 정보는 응답/로그에 넣지 않는다.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { DAILY_IMPORT_LIMIT, MAX_MEMOS_PER_SHARE, MAX_PHOTOS_PER_SHARE, chunk, copiedPhotoPath, isValidShareToken, rpcErrorToResponse } from './logic.ts';

const BUCKET = 'memo-photos';
const PARALLEL_COPIES = 8;
const STORAGE_REMOVE_BATCH = 100;
// Edge Function 실행 시간 제한 안에 응답하도록 사진 복사에 쓸 시간 예산.
const PHOTO_TIME_BUDGET_MS = 40_000;

type PhotoToCopy = { memo_id: string; path: string; width: number | null; height: number | null; position: number };
type ImportRow = { group_id: string; group_name: string; mode: 'created' | 'updated'; memo_count: number; photos: PhotoToCopy[]; old_paths: string[] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function removeFiles(admin: SupabaseClient, paths: string[]): Promise<void> {
  for (const batch of chunk(paths, STORAGE_REMOVE_BATCH)) {
    const { error } = await admin.storage.from(BUCKET).remove(batch);
    if (error) console.warn('import-share: files not removed', error.message);
  }
}

async function copyOnePhoto(admin: SupabaseClient, callerId: string, photo: PhotoToCopy): Promise<boolean> {
  const newPath = copiedPhotoPath(callerId, photo.memo_id, crypto.randomUUID());
  const { error: copyError } = await admin.storage.from(BUCKET).copy(photo.path, newPath);
  if (copyError) return false;
  const { error: insertError } = await admin.from('memo_photos').insert({
    memo_id: photo.memo_id,
    user_id: callerId,
    path: newPath,
    width: photo.width,
    height: photo.height,
    position: photo.position,
  });
  if (insertError) {
    await admin.storage.from(BUCKET).remove([newPath]);
    return false;
  }
  return true;
}

/** 메모는 이미 커밋됐다. 사진은 병렬 배치로 복사하고, 시간 예산을 넘기면 남은 사진은 건너뛴 것으로 센다. */
async function copyPhotos(admin: SupabaseClient, callerId: string, photos: PhotoToCopy[]): Promise<{ copied: number; skipped: number }> {
  const deadline = Date.now() + PHOTO_TIME_BUDGET_MS;
  let copied = 0;
  let skipped = 0;
  for (const batch of chunk(photos, PARALLEL_COPIES)) {
    if (Date.now() > deadline) {
      skipped += batch.length;
      continue;
    }
    const results = await Promise.all(batch.map((photo) => copyOnePhoto(admin, callerId, photo)));
    copied += results.filter(Boolean).length;
    skipped += results.filter((ok) => !ok).length;
  }
  return { copied, skipped };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  // 1) 호출자 확인 (anon 키 JWT는 user 가 없어 거부된다)
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
  const callerId = userData?.user?.id;
  if (userError || !callerId) return json({ error: 'UNAUTHORIZED' }, 401);

  let body: { token?: unknown; undo?: unknown; groupId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_REQUEST' }, 400);
  }
  if (!isValidShareToken(body.token)) return json({ error: 'INVALID_TOKEN' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2) 되돌리기
  if (body.undo === true) {
    if (typeof body.groupId !== 'string') return json({ error: 'INVALID_REQUEST' }, 400);
    const { data, error } = await admin.rpc('undo_share_import', { p_caller: callerId, p_token: body.token, p_group_id: body.groupId });
    if (error) {
      const mapped = rpcErrorToResponse(error.message);
      if (mapped.status === 500) console.error('import-share: undo failed', error.message);
      return json({ error: mapped.error }, mapped.status);
    }
    await removeFiles(admin, (data as { paths: string[] }).paths ?? []);
    return json({ undone: true });
  }

  // 3) 가져오기 — 행 작업은 한 트랜잭션
  const { data, error } = await admin.rpc('import_share_copy', {
    p_caller: callerId,
    p_token: body.token,
    p_max_memos: MAX_MEMOS_PER_SHARE,
    p_max_photos: MAX_PHOTOS_PER_SHARE,
    p_daily_limit: DAILY_IMPORT_LIMIT,
  });
  if (error) {
    const mapped = rpcErrorToResponse(error.message);
    if (mapped.status === 500) console.error('import-share: import failed', error.message);
    return json({ error: mapped.error }, mapped.status);
  }
  const result = data as ImportRow;

  // 4) 커밋 이후: 교체된 이전 사진 파일 삭제 → 새 사진 복사
  await removeFiles(admin, result.old_paths ?? []);
  const { copied, skipped } = await copyPhotos(admin, callerId, result.photos ?? []);

  return json({
    groupId: result.group_id,
    groupName: result.group_name,
    memoCount: result.memo_count,
    photoCount: copied,
    skippedPhotos: skipped,
    mode: result.mode,
  });
});
