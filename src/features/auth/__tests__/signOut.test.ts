import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

import { signOut } from '../signOut';

jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: jest.fn() } } }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const signOutMock = supabase.auth.signOut as jest.Mock;

describe('signOut', () => {
  test('clears the query cache after signing out', async () => {
    signOutMock.mockResolvedValue({ error: null });
    queryClient.setQueryData(['memos'], [{ id: 'm1' }]);

    await signOut();

    expect(queryClient.getQueryData(['memos'])).toBeUndefined();
  });

  test('still clears the cache and throws when sign out fails', async () => {
    signOutMock.mockResolvedValue({ error: new Error('network') });
    queryClient.setQueryData(['memos'], [{ id: 'm1' }]);

    await expect(signOut()).rejects.toMatchObject({ code: 'UNKNOWN' });
    expect(queryClient.getQueryData(['memos'])).toBeUndefined();
  });
});
