import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

import { signInWithKakao } from '../signInWithKakao';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithOAuth: jest.fn(), exchangeCodeForSession: jest.fn() } },
}));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `memomap://${path}`,
  parse: (url: string) => ({ queryParams: Object.fromEntries(new URL(url).searchParams) }),
}));

const auth = supabase.auth as unknown as { signInWithOAuth: jest.Mock; exchangeCodeForSession: jest.Mock };
const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://ref.supabase.co/auth/v1/authorize?provider=kakao' }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe('signInWithKakao', () => {
  test('requests OAuth with the app redirect and exchanges the returned code', async () => {
    // Arrange
    openAuthSession.mockResolvedValue({ type: 'success', url: 'memomap://auth/callback?code=abc123' });

    // Act
    const result = await signInWithKakao();

    // Assert
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: { redirectTo: 'memomap://auth/callback', skipBrowserRedirect: true },
    });
    expect(openAuthSession).toHaveBeenCalledWith('https://ref.supabase.co/auth/v1/authorize?provider=kakao', 'memomap://auth/callback');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(result).toBe(true);
  });

  test('returns false without exchanging when the user cancels', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' });

    await expect(signInWithKakao()).resolves.toBe(false);
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test('treats a Kakao consent denial as a cancel', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'memomap://auth/callback?error=access_denied' });

    await expect(signInWithKakao()).resolves.toBe(false);
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test('throws AUTH when the callback has no code', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'memomap://auth/callback?error=server_error' });

    await expect(signInWithKakao()).rejects.toMatchObject({ code: 'AUTH' });
  });

  test('throws AppError when the code exchange fails', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'memomap://auth/callback?code=abc' });
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('invalid grant') });

    await expect(signInWithKakao()).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});
