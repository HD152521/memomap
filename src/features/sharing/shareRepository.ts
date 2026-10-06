import * as Linking from 'expo-linking';

import { AppError, toAppError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';

import { isValidShareToken } from './shareToken';

export type ImportResult = {
  groupId: string;
  groupName: string;
  memoCount: number;
  photoCount: number;
  skippedPhotos: number;
  mode: 'created' | 'updated';
};

const IMPORT_FUNCTION = 'import-share';

function httpStatusOf(e: unknown): number | null {
  const status = (e as { context?: { status?: unknown } } | null)?.context?.status;
  return typeof status === 'number' ? status : null;
}

/** Edge Function 응답 상태 → 사용자 메시지. 429(일일 한도)는 toAppError 가 RATE_LIMITED 로 처리한다. */
export function toShareError(e: unknown): AppError {
  switch (httpStatusOf(e)) {
    case 404:
      return new AppError('NOT_FOUND', '만료되었거나 없는 공유 링크예요', { cause: e });
    case 409:
      return new AppError('VALIDATION', '내가 만든 공유 링크예요', { cause: e });
    case 413:
      return new AppError('VALIDATION', '공유 그룹이 너무 커서 가져올 수 없어요', { cause: e });
    default:
      return toAppError(e);
  }
}

export function shareUrl(token: string): string {
  return Linking.createURL(`share/${token}`);
}

export const shareRepository = {
  /** 내 그룹의 활성 링크(없으면 새로 생성) URL. */
  async create(groupId: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_group_share', { p_group_id: groupId });
    if (error) throw toAppError(error);
    if (!isValidShareToken(data)) throw new AppError('UNKNOWN', '공유 링크를 만들지 못했어요');
    return shareUrl(data);
  },

  /** 공유 미리보기용: 그룹에 속한 메모들의 사진 수. */
  async photoCount(groupId: string): Promise<number> {
    const { count, error } = await supabase
      .from('memo_photos')
      .select('id, memos!inner(group_id)', { count: 'exact', head: true })
      .eq('memos.group_id', groupId);
    if (error) throw toAppError(error);
    return count ?? 0;
  },

  async revoke(groupId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_group_share', { p_group_id: groupId });
    if (error) throw toAppError(error);
  },

  async importShare(token: string): Promise<ImportResult> {
    if (!isValidShareToken(token)) throw new AppError('NOT_FOUND', '만료되었거나 없는 공유 링크예요');
    const { data, error } = await supabase.functions.invoke<ImportResult>(IMPORT_FUNCTION, { body: { token } });
    if (error || !data) throw toShareError(error);
    return data;
  },

  async undoImport(token: string, groupId: string): Promise<void> {
    const { error } = await supabase.functions.invoke(IMPORT_FUNCTION, { body: { token, undo: true, groupId } });
    if (!error) return;
    // 되돌리기는 가져온 직후(10분 이내)에만 된다.
    if (httpStatusOf(error) === 404) throw new AppError('NOT_FOUND', '되돌릴 수 있는 시간이 지났어요', { cause: error });
    throw toShareError(error);
  },
};
