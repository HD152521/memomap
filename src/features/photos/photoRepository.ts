import * as Crypto from 'expo-crypto';

import { AppError, toAppError } from '@/lib/appError';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

import { resizeImage } from './resizeImage';
import { MAX_PHOTOS_PER_MEMO, type LocalPhoto, type MemoPhoto, type MemoPhotoRow, type PhotoChanges, type PhotoSaveResult } from './types';

const TABLE = 'memo_photos';
const BUCKET = 'memo-photos';
const SIGNED_URL_SECONDS = 60 * 60;

export function toMemoPhoto(row: MemoPhotoRow, url: string | null): MemoPhoto {
  return { id: row.id, memoId: row.memo_id, path: row.path, position: row.position, width: row.width, height: row.height, url };
}

/** 남아 있는 사진이 쓰는 자리를 피해 0부터 빈 자리를 count개 고른다. unique(memo_id, position) 충돌 방지. */
export function freePositions(used: number[], count: number): number[] {
  const taken = new Set(used);
  const free: number[] = [];
  for (let position = 0; position < MAX_PHOTOS_PER_MEMO && free.length < count; position++) {
    if (!taken.has(position)) free.push(position);
  }
  return free;
}

/** Storage 경로 첫 폴더는 반드시 본인 id여야 한다(Storage 정책·DB 트리거가 확인). */
export function photoPath(userId: string, memoId: string, fileId: string): string {
  return `${userId}/${memoId}/${fileId}.jpg`;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (error || !userId) throw new AppError('AUTH', '다시 로그인해 주세요');
  return userId;
}

async function readAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

async function upload(userId: string, memoId: string, photo: LocalPhoto, position: number): Promise<void> {
  const resized = await resizeImage(photo.uri, photo.width, photo.height);
  const path = photoPath(userId, memoId, Crypto.randomUUID());
  const body = await readAsArrayBuffer(resized.uri);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw toAppError(uploadError);

  const { error: insertError } = await supabase
    .from(TABLE)
    .insert({ memo_id: memoId, path, position, width: resized.width, height: resized.height });
  if (insertError) {
    // 행을 못 만들면 파일만 남지 않게 지운다.
    await supabase.storage.from(BUCKET).remove([path]);
    throw toAppError(insertError);
  }
}

async function remove(photo: MemoPhoto): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', photo.id);
  if (error) throw toAppError(error);
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.path]);
  if (storageError) logger.warn('photo file not removed', { photoId: photo.id, message: storageError.message });
}

export const photoRepository = {
  async listByMemo(memoId: string): Promise<MemoPhoto[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, memo_id, path, position, width, height')
      .eq('memo_id', memoId)
      .order('position', { ascending: true })
      .returns<MemoPhotoRow[]>();
    if (error) throw toAppError(error);
    if (data.length === 0) return [];

    const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrls(
      data.map((row) => row.path),
      SIGNED_URL_SECONDS,
    );
    if (signError) throw toAppError(signError);
    const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
    return data.map((row) => toMemoPhoto(row, urlByPath.get(row.path) ?? null));
  },

  /**
   * 메모 저장 이후 호출: 지운 사진을 먼저 정리해 자리를 비우고, 새 사진을 빈 자리에 올린다.
   * 업로드 일부가 실패해도 나머지는 계속 올리고 실패 수를 돌려준다(메모 자체는 이미 저장됨).
   */
  async applyChanges(memoId: string, existing: MemoPhoto[], changes: PhotoChanges): Promise<PhotoSaveResult> {
    if (changes.added.length === 0 && changes.removed.length === 0) return { failedUploads: 0 };

    for (const photo of changes.removed) {
      await remove(photo);
    }

    const removedIds = new Set(changes.removed.map((photo) => photo.id));
    const remaining = existing.filter((photo) => !removedIds.has(photo.id));
    const positions = freePositions(
      remaining.map((photo) => photo.position),
      changes.added.length,
    );
    if (positions.length < changes.added.length) {
      throw new AppError('VALIDATION', `사진은 메모당 ${MAX_PHOTOS_PER_MEMO}장까지 올릴 수 있어요`);
    }

    const userId = await currentUserId();
    let failedUploads = 0;
    for (const [index, photo] of changes.added.entries()) {
      try {
        await upload(userId, memoId, photo, positions[index]);
      } catch (e) {
        failedUploads += 1;
        logger.warn('photo upload failed', { memoId, code: toAppError(e).code });
      }
    }
    return { failedUploads };
  },
};
