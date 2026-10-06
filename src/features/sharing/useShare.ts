import { useMutation, useQueryClient } from '@tanstack/react-query';

import { groupKeys } from '@/features/groups/useGroups';
import { memoKeys } from '@/features/memos/useMemos';
import type { AppError } from '@/lib/appError';

import { shareRepository, type ImportResult } from './shareRepository';

export function useCreateShare() {
  return useMutation<string, AppError, string>({ mutationFn: (groupId) => shareRepository.create(groupId) });
}

export function useRevokeShare() {
  return useMutation<void, AppError, string>({ mutationFn: (groupId) => shareRepository.revoke(groupId) });
}

function useRefreshMemosAndGroups() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      queryClient.invalidateQueries({ queryKey: memoKeys.all }),
    ]);
}

export function useImportShare() {
  const refresh = useRefreshMemosAndGroups();
  return useMutation<ImportResult, AppError, string>({ mutationFn: (token) => shareRepository.importShare(token), onSuccess: () => refresh() });
}

export function useUndoImport() {
  const refresh = useRefreshMemosAndGroups();
  return useMutation<void, AppError, { token: string; groupId: string }>({
    mutationFn: ({ token, groupId }) => shareRepository.undoImport(token, groupId),
    onSuccess: () => refresh(),
  });
}
