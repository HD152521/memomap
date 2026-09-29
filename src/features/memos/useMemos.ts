import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AppError } from '@/lib/appError';

import { memoRepository } from './memoRepository';
import { isUuid } from './routeParams';
import type { MemoInput, MemoPatch } from './memoSchema';
import type { Memo } from './types';

export const memoKeys = {
  all: ['memos'] as const,
  detail: (id: string) => ['memos', id] as const,
};

export function useMemos() {
  return useQuery<Memo[], AppError>({ queryKey: memoKeys.all, queryFn: memoRepository.listMine });
}

export function useMemoDetail(id: string) {
  // 딥링크로 들어온 잘못된 id는 조회하지 않는다 (Postgres 22P02 → 재시도해도 성공할 수 없음).
  return useQuery<Memo, AppError>({ queryKey: memoKeys.detail(id), queryFn: () => memoRepository.getById(id), enabled: isUuid(id) });
}

export function useCreateMemo() {
  const queryClient = useQueryClient();
  return useMutation<Memo, AppError, MemoInput>({
    mutationFn: memoRepository.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memoKeys.all }),
  });
}

export function useUpdateMemo(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Memo, AppError, MemoPatch>({
    mutationFn: (patch) => memoRepository.update(id, patch),
    onSuccess: (memo) => {
      queryClient.setQueryData(memoKeys.detail(id), memo);
      return queryClient.invalidateQueries({ queryKey: memoKeys.all, exact: true });
    },
  });
}

export function useDeleteMemo() {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: memoRepository.remove,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: memoKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: memoKeys.all, exact: true });
    },
  });
}
