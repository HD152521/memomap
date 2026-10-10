import { useMutation, useQuery } from '@tanstack/react-query';

import type { AppError } from '@/lib/appError';

import { promiseRepository, type PromiseView } from './promiseRepository';

export function useCreatePromiseShare() {
  return useMutation<string, AppError, string>({ mutationFn: (memoId) => promiseRepository.createShare(memoId) });
}

export function useRevokePromiseShare() {
  return useMutation<void, AppError, string>({ mutationFn: (memoId) => promiseRepository.revokeShare(memoId) });
}

export function usePromiseView(token: string) {
  return useQuery<PromiseView, AppError>({
    queryKey: ['promise', token],
    queryFn: () => promiseRepository.view(token),
    retry: (count, error) => error.code !== 'NOT_FOUND' && count < 2,
  });
}
