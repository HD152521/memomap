import { useQuery } from '@tanstack/react-query';

import { isUuid } from '@/features/memos/routeParams';
import type { AppError } from '@/lib/appError';

import { photoRepository } from './photoRepository';
import type { MemoPhoto } from './types';

// 서명 URL이 1시간 뒤 만료되므로 그 전에 다시 받는다.
const PHOTO_STALE_MS = 50 * 60_000;

export const photoKeys = {
  byMemo: (memoId: string) => ['photos', memoId] as const,
};

export function useMemoPhotos(memoId: string) {
  return useQuery<MemoPhoto[], AppError>({
    queryKey: photoKeys.byMemo(memoId),
    queryFn: () => photoRepository.listByMemo(memoId),
    enabled: isUuid(memoId),
    staleTime: PHOTO_STALE_MS,
  });
}
