import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { memoKeys } from '@/features/memos/useMemos';
import type { AppError } from '@/lib/appError';

import { groupKeys } from './groupKeys';
import { groupRepository } from './groupRepository';
import type { GroupInput, GroupPatch } from './groupSchema';
import type { MemoGroup } from './types';

export { groupKeys } from './groupKeys';

export function useGroups() {
  return useQuery<MemoGroup[], AppError>({ queryKey: groupKeys.all, queryFn: groupRepository.listMine });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation<MemoGroup, AppError, GroupInput>({
    mutationFn: groupRepository.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation<MemoGroup, AppError, GroupPatch>({
    mutationFn: (patch) => groupRepository.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: groupRepository.remove,
    // 소속 메모가 분류 없음으로 바뀌므로 메모 목록도 다시 읽는다.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
        queryClient.invalidateQueries({ queryKey: memoKeys.all }),
      ]),
  });
}

/** id → 그룹. 마커 색·칩 표시용. */
export function useGroupMap(): Map<string, MemoGroup> {
  const { data = [] } = useGroups();
  return new Map(data.map((group) => [group.id, group]));
}
