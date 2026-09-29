import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from '@/lib/supabase';

import { signInWithApple } from '../signInWithApple';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: jest.fn(), updateUser: jest.fn() } },
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'raw-nonce',
  digestStringAsync: jest.fn().mockResolvedValue('hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const auth = supabase.auth as unknown as { signInWithIdToken: jest.Mock; updateUser: jest.Mock };
const signInAsync = AppleAuthentication.signInAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  auth.signInWithIdToken.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
});

describe('signInWithApple', () => {
  test('signs in with the identity token and saves the name on first login', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'id-token', fullName: { familyName: '안', givenName: '용식' } });

    await expect(signInWithApple()).resolves.toBe(true);

    expect(signInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: 'hashed-nonce' }));
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'id-token', nonce: 'raw-nonce' });
    expect(auth.updateUser).toHaveBeenCalledWith({ data: { full_name: '안용식' } });
  });

  test('skips name update when Apple does not send a name', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'id-token', fullName: null });

    await signInWithApple();

    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  test('returns false silently when the user cancels', async () => {
    signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    await expect(signInWithApple()).resolves.toBe(false);
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  test('throws AUTH when no identity token is returned', async () => {
    signInAsync.mockResolvedValue({ identityToken: null, fullName: null });

    await expect(signInWithApple()).rejects.toMatchObject({ code: 'AUTH' });
  });
});
