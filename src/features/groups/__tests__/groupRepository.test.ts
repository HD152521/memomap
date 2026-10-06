import { supabase } from '@/lib/supabase';
import { queryBuilder } from '@/test/supabaseMock';

import { groupRepository, toGroup } from '../groupRepository';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const fromMock = supabase.from as jest.Mock;
const row = { id: 'g1', name: '맛집', emoji: '🍜', color: '#E8553E', source_share_id: null, memos: [{ count: 3 }] };

beforeEach(() => fromMock.mockReset());

describe('toGroup', () => {
  test('maps the embedded memo count', () => {
    expect(toGroup(row)).toEqual({ id: 'g1', name: '맛집', emoji: '🍜', color: '#E8553E', sourceShareId: null, memoCount: 3 });
  });

  test('defaults the count to 0 when the embed is missing', () => {
    expect(toGroup({ ...row, memos: undefined }).memoCount).toBe(0);
  });
});

describe('groupRepository', () => {
  test('listMine selects groups with memo counts in creation order', async () => {
    const builder = queryBuilder({ data: [row], error: null });
    fromMock.mockReturnValueOnce(builder);

    const groups = await groupRepository.listMine();

    expect(fromMock).toHaveBeenCalledWith('memo_groups');
    expect(builder.select).toHaveBeenCalledWith(expect.stringContaining('memos(count)'));
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(groups[0].memoCount).toBe(3);
  });

  test('create inserts validated values without user_id', async () => {
    const builder = queryBuilder({ data: row, error: null });
    fromMock.mockReturnValueOnce(builder);

    await groupRepository.create({ name: ' 맛집 ', emoji: '🍜', color: '#E8553E' });

    expect(builder.insert).toHaveBeenCalledWith({ name: '맛집', emoji: '🍜', color: '#E8553E' });
  });

  test('create maps a duplicate name to a friendly validation error', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: { code: '23505', message: 'duplicate key' } }));

    await expect(groupRepository.create({ name: '맛집', emoji: '🍜', color: '#E8553E' })).rejects.toMatchObject({
      code: 'VALIDATION',
      userMessage: '같은 이름의 그룹이 있어요',
    });
  });

  test('create rejects invalid input before calling supabase', async () => {
    await expect(groupRepository.create({ name: '', emoji: '🍜', color: '#E8553E' })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  test('update patches by id', async () => {
    const builder = queryBuilder({ data: { ...row, name: '찐맛집' }, error: null });
    fromMock.mockReturnValueOnce(builder);

    const group = await groupRepository.update('g1', { name: '찐맛집' });

    expect(builder.update).toHaveBeenCalledWith({ name: '찐맛집' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'g1');
    expect(group.name).toBe('찐맛집');
  });

  test('remove deletes by id and wraps errors', async () => {
    const builder = queryBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(builder);
    await groupRepository.remove('g1');
    expect(builder.delete).toHaveBeenCalled();

    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: { code: '42501', message: 'rls' } }));
    await expect(groupRepository.remove('g1')).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});
