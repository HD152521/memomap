import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { memoRepository } from '../memoRepository';
import type { Memo } from '../types';
import { memoKeys, useCreateMemo, useDeleteMemo, useMemoDetail, useMemos, useUpdateMemo } from '../useMemos';

jest.mock('../memoRepository', () => ({
  memoRepository: { listMine: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));

const repo = memoRepository as jest.Mocked<typeof memoRepository>;
const MEMO_UUID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';

const memo: Memo = {
  id: 'm1',
  title: '카페',
  address: null,
  naverPlaceId: null,
  lat: 37.5,
  lng: 127,
  body: '',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => jest.clearAllMocks());

describe('useMemos hooks', () => {
  test('useMemos loads the list from the repository', async () => {
    repo.listMine.mockResolvedValue([memo]);
    const { wrapper } = setup();

    const { result } = await renderHook(() => useMemos(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([memo]));
  });

  test('useMemoDetail loads a single memo by id', async () => {
    repo.getById.mockResolvedValue(memo);
    const { wrapper } = setup();

    const { result } = await renderHook(() => useMemoDetail(MEMO_UUID), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(memo));
    expect(repo.getById).toHaveBeenCalledWith(MEMO_UUID);
  });

  test('useMemoDetail does not query an invalid id', async () => {
    const { wrapper } = setup();

    const { result } = await renderHook(() => useMemoDetail('garbage'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(repo.getById).not.toHaveBeenCalled();
  });

  test('useCreateMemo invalidates the memo list', async () => {
    repo.create.mockResolvedValue(memo);
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useCreateMemo(), { wrapper });

    await act(() => result.current.mutateAsync({ title: '카페', address: null, lat: 37.5, lng: 127, body: '', naverPlaceId: null }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: memoKeys.all });
  });

  test('useUpdateMemo writes the detail cache and invalidates the list', async () => {
    const updated = { ...memo, body: '수정' };
    repo.update.mockResolvedValue(updated);
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useUpdateMemo('m1'), { wrapper });

    await act(() => result.current.mutateAsync({ body: '수정' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(repo.update).toHaveBeenCalledWith('m1', { body: '수정' });
    expect(client.getQueryData(memoKeys.detail('m1'))).toEqual(updated);
  });

  test('useDeleteMemo removes the detail cache', async () => {
    repo.remove.mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    client.setQueryData(memoKeys.detail('m1'), memo);
    const { result } = await renderHook(() => useDeleteMemo(), { wrapper });

    await act(() => result.current.mutateAsync('m1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(memoKeys.detail('m1'))).toBeUndefined();
  });
});
