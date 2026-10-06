import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { memoKeys } from '@/features/memos/useMemos';

import { groupRepository } from '../groupRepository';
import { groupKeys, useDeleteGroup, useGroupMap, useGroups } from '../useGroups';

jest.mock('../groupRepository', () => ({
  groupRepository: { listMine: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));
jest.mock('@/features/memos/memoRepository', () => ({ memoRepository: {} }));

const repo = groupRepository as jest.Mocked<typeof groupRepository>;
const group = { id: 'g1', name: '맛집', emoji: '🍜', color: '#E8553E', sourceShareId: null, memoCount: 2 };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => jest.clearAllMocks());

describe('useGroups hooks', () => {
  test('useGroups and useGroupMap expose groups by id', async () => {
    repo.listMine.mockResolvedValue([group]);
    const { wrapper } = setup();

    const { result } = await renderHook(() => ({ list: useGroups(), map: useGroupMap() }), { wrapper });

    await waitFor(() => expect(result.current.list.data).toEqual([group]));
    expect(result.current.map.get('g1')?.name).toBe('맛집');
  });

  test('useDeleteGroup refreshes groups and memos', async () => {
    repo.remove.mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useDeleteGroup(), { wrapper });

    await act(() => result.current.mutateAsync('g1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: groupKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: memoKeys.all });
  });
});
