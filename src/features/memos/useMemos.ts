import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { groupKeys } from '@/features/groups/groupKeys';
import type { AppError } from '@/lib/appError';

import { memoRepository } from './memoRepository';
import { isUuid } from './routeParams';
import type { MemoInput, MemoPatch } from './memoSchema';
import type { Memo } from './types';

export const memoKeys = {
  all: ['memos'] as const,
  detail: (id: string) => ['memos', id] as const,
};

/** 'all' = 전체, 'none' = 분류 없음, 그 외 = 그룹 id */
export type MemoFilter = 'all' | 'none' | string;

export function filterMemos(memos: Memo[], filter: MemoFilter): Memo[] {
  if (filter === 'all') return memos;
  if (filter === 'none') return memos.filter((memo) => memo.groupId === null);
  return memos.filter((memo) => memo.groupId === filter);
}

// 지도는 메모 전체를 이미 불러오므로 필터는 서버 재요청 없이 캐시에서 고른다.
export function useMemos(filter: MemoFilter = 'all') {
  return useQuery<Memo[], AppError, Memo[]>({
    queryKey: memoKeys.all,
    queryFn: memoRepository.listMine,
    select: (memos) => filterMemos(memos, filter),
  });
}

export function useMemoDetail(id: string) {
  // 딥링크로 들어온 잘못된 id는 조회하지 않는다 (Postgres 22P02 → 재시도해도 성공할 수 없음).
  return useQuery<Memo, AppError>({ queryKey: memoKeys.detail(id), queryFn: () => memoRepository.getById(id), enabled: isUuid(id) });
}

export function useCreateMemo() {
  const queryClient = useQueryClient();
  return useMutation<Memo, AppError, MemoInput>({
    mutationFn: (input) => memoRepository.create(input),
    // 그룹별 메모 수(memos(count))도 바뀐다.
    onSuccess: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: memoKeys.all }), queryClient.invalidateQueries({ queryKey: groupKeys.all })]),
  });
}

export function useUpdateMemo(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Memo, AppError, MemoPatch>({
    mutationFn: (patch) => memoRepository.update(id, patch),
    onSuccess: (memo) => {
      queryClient.setQueryData(memoKeys.detail(id), memo);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: memoKeys.all, exact: true }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      ]);
    },
  });
}

export function useDeleteMemo() {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: (id) => memoRepository.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: memoKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: memoKeys.all, exact: true }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      ]);
    },
  });
}
