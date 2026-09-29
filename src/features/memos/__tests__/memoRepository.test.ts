import { AppError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';

import { memoRepository, toMemo } from '../memoRepository';
import type { MemoRow } from '../types';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const row: MemoRow = {
  id: 'm1',
  user_id: 'u1',
  title: '스타벅스 강남점',
  address: '서울 강남구',
  naver_place_id: null,
  lat: 37.4979,
  lng: 127.0276,
  body: '비번 1234',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

type Result = { data: unknown; error: unknown };

// supabase 쿼리 빌더 체인을 흉내낸다. 어떤 메서드를 불러도 자신을 반환하고, await 하면 result를 준다.
function queryBuilder(result: Result) {
  const builder: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'returns']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.then = (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const fromMock = supabase.from as jest.Mock;

beforeEach(() => fromMock.mockReset());

describe('toMemo', () => {
  test('maps snake_case row to camelCase memo', () => {
    expect(toMemo(row)).toEqual({
      id: 'm1',
      title: '스타벅스 강남점',
      address: '서울 강남구',
      naverPlaceId: null,
      lat: 37.4979,
      lng: 127.0276,
      body: '비번 1234',
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
    expect(memo).toEqual(toMemo(row));
  });

  test('throws VALIDATION without calling supabase for a blank title', async () => {
    await expect(memoRepository.create({ ...input, title: ' ' })).rejects.toMatchObject({ code: 'VALIDATION', userMessage: '장소 이름을 입력하세요' });
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
  test('deletes by id', async () => {
    const builder = queryBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(builder);

    await memoRepository.remove('m1');

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'm1');
  });
});
