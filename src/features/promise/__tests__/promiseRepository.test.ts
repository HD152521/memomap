import { supabase } from '@/lib/supabase';

import { promiseRepository, promiseShareMessage, promiseWebUrl } from '../promiseRepository';

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn(), functions: { invoke: jest.fn() } } }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const rpc = supabase.rpc as jest.Mock;
const invoke = supabase.functions.invoke as jest.Mock;
const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';
const httpError = (status: number) => ({ name: 'FunctionsHttpError', context: { status } });

beforeEach(() => jest.clearAllMocks());

describe('promise links', () => {
  test('puts the token after # so the web host never logs it', () => {
    expect(promiseWebUrl(TOKEN)).toMatch(new RegExp(`^https://.+#${TOKEN}$`));
  });

  test('builds a chat message with title, dates and link but never the secret', () => {
    const message = promiseShareMessage({ title: '강릉 숙소', promiseStart: '2026-11-21', promiseEnd: '2026-11-22' }, TOKEN);

    expect(message).toContain('📍 강릉 숙소 · 11/21(토) – 11/22(일)');
    expect(message).toContain(promiseWebUrl(TOKEN));
  });
});

describe('promiseRepository.createShare', () => {
  test('returns the token from the RPC', async () => {
    rpc.mockResolvedValue({ data: TOKEN, error: null });

    await expect(promiseRepository.createShare('m1')).resolves.toBe(TOKEN);
    expect(rpc).toHaveBeenCalledWith('create_promise_share', { p_memo_id: 'm1' });
  });

  test('explains when the memo has no promise date', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'PROMISE_DATE_REQUIRED' } });

    await expect(promiseRepository.createShare('m1')).rejects.toMatchObject({ code: 'VALIDATION', userMessage: '약속 날짜를 먼저 정해 주세요' });
  });

  test('rejects a malformed token from the server', async () => {
    rpc.mockResolvedValue({ data: 'short', error: null });

    await expect(promiseRepository.createShare('m1')).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

describe('promiseRepository.view', () => {
  test('does not call the server for an invalid token', async () => {
    await expect(promiseRepository.view('../etc')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(invoke).not.toHaveBeenCalled();
  });

  test('maps revoked (404) and expired (410) links to friendly messages', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(404) });
    await expect(promiseRepository.view(TOKEN)).rejects.toMatchObject({ userMessage: '없거나 꺼진 약속 링크예요' });

    invoke.mockResolvedValueOnce({ data: null, error: httpError(410) });
    await expect(promiseRepository.view(TOKEN)).rejects.toMatchObject({ userMessage: '지난 약속이라 링크가 만료됐어요' });
  });

  test('returns the view', async () => {
    const view = { title: '강릉 숙소', promiseStart: '2026-11-21', secretNote: '현관 4321' };
    invoke.mockResolvedValue({ data: view, error: null });

    await expect(promiseRepository.view(TOKEN)).resolves.toEqual(view);
    expect(invoke).toHaveBeenCalledWith('promise-view', { body: { token: TOKEN } });
  });
});
