import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { groupKeys } from '@/features/groups/useGroups';
import { memoKeys } from '@/features/memos/useMemos';

import { shareRepository } from '../shareRepository';
import { useCreateShare, useImportShare, useRevokeShare, useUndoImport } from '../useShare';

jest.mock('../shareRepository', () => ({
  shareRepository: { create: jest.fn(), revoke: jest.fn(), importShare: jest.fn(), undoImport: jest.fn() },
}));
jest.mock('@/features/memos/memoRepository', () => ({ memoRepository: {} }));
jest.mock('@/features/groups/groupRepository', () => ({ groupRepository: {} }));

const repo = shareRepository as jest.Mocked<typeof shareRepository>;
const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => jest.clearAllMocks());

describe('useShare hooks', () => {
  test('useImportShare refreshes groups and memos after importing', async () => {
    repo.importShare.mockResolvedValue({ groupId: 'g2', groupName: '맛집', memoCount: 1, photoCount: 0, skippedPhotos: 0, mode: 'created' });
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useImportShare(), { wrapper });

    await act(() => result.current.mutateAsync(TOKEN));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.importShare).toHaveBeenCalledWith(TOKEN);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: groupKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: memoKeys.all });
  });

  test('useUndoImport passes token and group id', async () => {
    repo.undoImport.mockResolvedValue(undefined);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useUndoImport(), { wrapper });

    await act(() => result.current.mutateAsync({ token: TOKEN, groupId: 'g2' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.undoImport).toHaveBeenCalledWith(TOKEN, 'g2');
  });

  test('useCreateShare and useRevokeShare call the repository', async () => {
    repo.create.mockResolvedValue('memomap://share/x');
    repo.revoke.mockResolvedValue(undefined);
    const { wrapper } = setup();
    const { result } = await renderHook(() => ({ create: useCreateShare(), revoke: useRevokeShare() }), { wrapper });

    await act(() => result.current.create.mutateAsync('g1'));
    await act(() => result.current.revoke.mutateAsync('g1'));
    await waitFor(() => expect(result.current.revoke.isSuccess).toBe(true));

    expect(repo.create).toHaveBeenCalledWith('g1');
    expect(repo.revoke).toHaveBeenCalledWith('g1');
  });
});
