import { AppError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';
import { queryBuilder } from '@/test/supabaseMock';

import { memoRepository, toMemo } from '../memoRepository';
import type { MemoRow } from '../types';

const mockStorageRemove = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), storage: { from: jest.fn(() => ({ remove: mockStorageRemove })) } } }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const row: MemoRow = {
  id: 'm1',
  user_id: 'u1',
  title: '스타벅스 강남점',
  address: '서울 강남구',
  naver_place_id: null,
  group_id: null,
  lat: 37.4979,
  lng: 127.0276,
  body: '비번 1234',
  secret_note: '현관 1234',
  visible_months: [12, 1, 2],
  visible_weekdays: null,
  promise_start: null,
  promise_end: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const fromMock = supabase.from as jest.Mock;

beforeEach(() => {
  fromMock.mockReset();
  mockStorageRemove.mockReset().mockResolvedValue({ error: null });
});

describe('toMemo', () => {
  test('maps snake_case row to camelCase memo', () => {
    expect(toMemo(row)).toEqual({
      id: 'm1',
      title: '스타벅스 강남점',
      address: '서울 강남구',
      naverPlaceId: null,
      groupId: null,
      lat: 37.4979,
      lng: 127.0276,
      body: '비번 1234',
      secretNote: '현관 1234',
      visibleMonths: [12, 1, 2],
      visibleWeekdays: null,
      promiseStart: null,
      promiseEnd: null,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    });
  });
});

describe('memoRepository.create', () => {
  const input = { title: '스타벅스 강남점', address: '서울 강남구', lat: 37.4979, lng: 127.0276, body: '비번 1234', naverPlaceId: null };

  test('inserts EWKT location without user_id and builds the memo without a second request', async () => {
    // Arrange
    const insertBuilder = queryBuilder({ data: { id: 'm1', created_at: row.created_at, updated_at: row.updated_at }, error: null });
    fromMock.mockReturnValueOnce(insertBuilder);

    // Act
    const memo = await memoRepository.create(input);

    // Assert
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('memos');
    const payload = insertBuilder.insert.mock.calls[0][0];
    expect(payload.location).toBe('SRID=4326;POINT(127.0276 37.4979)');
    expect(payload).not.toHaveProperty('user_id');
    expect(memo).toEqual(toMemo({ ...row, secret_note: null, visible_months: null }));
  });

  test('throws VALIDATION without calling supabase for a too-long one-line memo', async () => {
    await expect(memoRepository.create({ ...input, title: '가'.repeat(101) })).rejects.toMatchObject({ code: 'VALIDATION', userMessage: '한 줄 메모는 100자 이하로 입력하세요' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  test('wraps a supabase error in AppError', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: { code: '42501', message: 'rls' } }));

    await expect(memoRepository.create(input)).rejects.toBeInstanceOf(AppError);
  });
});

describe('memoRepository.update', () => {
  test('does not touch location when coordinates are absent', async () => {
    const updateBuilder = queryBuilder({ data: { id: 'm1' }, error: null });
    fromMock.mockReturnValueOnce(updateBuilder).mockReturnValueOnce(queryBuilder({ data: row, error: null }));

    await memoRepository.update('m1', { body: '수정' });

    expect(updateBuilder.update).toHaveBeenCalledWith({ body: '수정' });
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'm1');
  });
});

describe('memoRepository.getById', () => {
  test('maps PGRST116 to NOT_FOUND', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: { code: 'PGRST116', message: 'no rows' } }));

    await expect(memoRepository.getById('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('memoRepository.listMine', () => {
  test('returns mapped memos ordered by the query', async () => {
    const builder = queryBuilder({ data: [row], error: null });
    fromMock.mockReturnValueOnce(builder);

    const memos = await memoRepository.listMine();

    expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(memos).toHaveLength(1);
    expect(memos[0].naverPlaceId).toBeNull();
  });
});

describe('memoRepository.remove', () => {
  test('deletes the memo row before removing its photo files', async () => {
    // Arrange
    const photoBuilder = queryBuilder({ data: [{ path: 'u1/m1/a.jpg' }, { path: 'u1/m1/b.jpg' }], error: null });
    const deleteBuilder = queryBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(photoBuilder).mockReturnValueOnce(deleteBuilder);

    // Act
    await memoRepository.remove('m1');

    // Assert
    expect(fromMock).toHaveBeenNthCalledWith(1, 'memo_photos');
    expect(photoBuilder.eq).toHaveBeenCalledWith('memo_id', 'm1');
    expect(fromMock).toHaveBeenNthCalledWith(2, 'memos');
    expect(mockStorageRemove).toHaveBeenCalledWith(['u1/m1/a.jpg', 'u1/m1/b.jpg']);
    expect(deleteBuilder.delete.mock.invocationCallOrder[0]).toBeLessThan(mockStorageRemove.mock.invocationCallOrder[0]);
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'm1');
  });

  test('skips storage when the memo has no photos', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: [], error: null })).mockReturnValueOnce(queryBuilder({ data: null, error: null }));

    await memoRepository.remove('m1');

    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  test('keeps the files when the row delete fails', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [{ path: 'u1/m1/a.jpg' }], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: null, error: { code: '42501', message: 'rls' } }));

    await expect(memoRepository.remove('m1')).rejects.toMatchObject({ code: 'UNKNOWN' });
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  test('still deletes the memo when photo file removal fails', async () => {
    mockStorageRemove.mockResolvedValue({ error: new Error('storage down') });
    const deleteBuilder = queryBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(queryBuilder({ data: [{ path: 'u1/m1/a.jpg' }], error: null })).mockReturnValueOnce(deleteBuilder);

    await memoRepository.remove('m1');

    expect(deleteBuilder.delete).toHaveBeenCalled();
  });
});

describe('memoRepository.create with group', () => {
  test('writes group_id when a group is chosen', async () => {
    const insertBuilder = queryBuilder({ data: { id: 'm1', created_at: row.created_at, updated_at: row.updated_at }, error: null });
    fromMock.mockReturnValueOnce(insertBuilder);
    const groupId = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';

    const memo = await memoRepository.create({ title: '계곡', address: null, lat: 37, lng: 127, body: '', naverPlaceId: null, groupId });

    expect(insertBuilder.insert.mock.calls[0][0].group_id).toBe(groupId);
    expect(memo.groupId).toBe(groupId);
  });

  test('rejects a malformed group id before calling supabase', async () => {
    await expect(
      memoRepository.create({ title: '계곡', address: null, lat: 37, lng: 127, body: '', naverPlaceId: null, groupId: 'garbage' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
