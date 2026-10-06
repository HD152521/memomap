import { supabase } from '@/lib/supabase';
import { queryBuilder } from '@/test/supabaseMock';

import { shareRepository, toShareError } from '../shareRepository';

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn(), from: jest.fn(), functions: { invoke: jest.fn() } } }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `memomap://${path}` }));

const rpc = supabase.rpc as jest.Mock;
const invoke = supabase.functions.invoke as jest.Mock;
const fromMock = supabase.from as jest.Mock;
const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';
const httpError = (status: number) => ({ name: 'FunctionsHttpError', context: { status } });

beforeEach(() => jest.clearAllMocks());

describe('toShareError', () => {
  test('maps edge function statuses to friendly messages', () => {
    expect(toShareError(httpError(404))).toMatchObject({ code: 'NOT_FOUND', userMessage: '만료되었거나 없는 공유 링크예요' });
    expect(toShareError(httpError(409))).toMatchObject({ code: 'VALIDATION', userMessage: '내가 만든 공유 링크예요' });
    expect(toShareError(httpError(413))).toMatchObject({ code: 'VALIDATION' });
    expect(toShareError(httpError(429))).toMatchObject({ code: 'RATE_LIMITED' });
  });
});

describe('shareRepository.create', () => {
  test('returns an app deep link for the token', async () => {
    rpc.mockResolvedValue({ data: TOKEN, error: null });

    await expect(shareRepository.create('g1')).resolves.toBe(`memomap://share/${TOKEN}`);
    expect(rpc).toHaveBeenCalledWith('create_group_share', { p_group_id: 'g1' });
  });

  test('rejects a malformed token from the server', async () => {
    rpc.mockResolvedValue({ data: 'short', error: null });

    await expect(shareRepository.create('g1')).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

describe('shareRepository.importShare', () => {
  test('does not call the server for an invalid token', async () => {
    await expect(shareRepository.importShare('../etc')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(invoke).not.toHaveBeenCalled();
  });

  test('returns the import result', async () => {
    const result = { groupId: 'g2', groupName: '맛집', memoCount: 2, photoCount: 1, skippedPhotos: 0, mode: 'created' };
    invoke.mockResolvedValue({ data: result, error: null });

    await expect(shareRepository.importShare(TOKEN)).resolves.toEqual(result);
    expect(invoke).toHaveBeenCalledWith('import-share', { body: { token: TOKEN } });
  });

  test('maps an expired link to NOT_FOUND', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(404) });

    await expect(shareRepository.importShare(TOKEN)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('shareRepository.undoImport / revoke / photoCount', () => {
  test('undo sends the created group id', async () => {
    invoke.mockResolvedValue({ data: { undone: true }, error: null });

    await shareRepository.undoImport(TOKEN, 'g2');

    expect(invoke).toHaveBeenCalledWith('import-share', { body: { token: TOKEN, undo: true, groupId: 'g2' } });
  });

  test('undo after the window explains why it failed', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(404) });

    await expect(shareRepository.undoImport(TOKEN, 'g2')).rejects.toMatchObject({ userMessage: '되돌릴 수 있는 시간이 지났어요' });
  });

  test('revoke calls the RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await shareRepository.revoke('g1');

    expect(rpc).toHaveBeenCalledWith('revoke_group_share', { p_group_id: 'g1' });
  });

  test('photoCount counts photos of memos in the group', async () => {
    const builder = queryBuilder({ data: null, error: null, count: 7 });
    fromMock.mockReturnValueOnce(builder);

    await expect(shareRepository.photoCount('g1')).resolves.toBe(7);
    expect(builder.eq).toHaveBeenCalledWith('memos.group_id', 'g1');
  });
});
