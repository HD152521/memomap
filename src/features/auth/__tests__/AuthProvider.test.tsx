import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

import { AuthProvider, useSession } from '../AuthProvider';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() } },
}));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const auth = supabase.auth as unknown as { getSession: jest.Mock; onAuthStateChange: jest.Mock };
const unsubscribe = jest.fn();
let emitAuthChange: (session: unknown, event?: string) => void = () => {};

function Probe() {
  const { session, isLoading } = useSession();
  return <Text>{isLoading ? 'loading' : session ? 'signed-in' : 'signed-out'}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  auth.onAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
    emitAuthChange = (session, event = 'SIGNED_IN') => callback(event, session);
    return { data: { subscription: { unsubscribe } } };
  });
});

describe('AuthProvider', () => {
  test('exposes signed-out after the stored session is empty', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('signed-out')).toBeTruthy();
  });

  test('exposes signed-in when a stored session exists', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 't', user: { id: 'u1' } } }, error: null });

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('signed-in')).toBeTruthy();
  });

  test('updates when auth state changes and unsubscribes on unmount', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { unmount } = await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('signed-out');

    await act(async () => emitAuthChange({ access_token: 'new', user: { id: 'u1' } }));
    expect(screen.getByText('signed-in')).toBeTruthy();

    await unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  test('clears the query cache when the session ends or the user changes', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 't', user: { id: 'u1' } } }, error: null });
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('signed-in');

    queryClient.setQueryData(['memos'], [{ id: 'm1' }]);
    await act(async () => emitAuthChange({ access_token: 't2', user: { id: 'u1' } }, 'TOKEN_REFRESHED'));
    expect(queryClient.getQueryData(['memos'])).toEqual([{ id: 'm1' }]);

    await act(async () => emitAuthChange(null, 'SIGNED_OUT'));
    expect(queryClient.getQueryData(['memos'])).toBeUndefined();
    expect(screen.getByText('signed-out')).toBeTruthy();

    queryClient.setQueryData(['memos'], [{ id: 'm2' }]);
    await act(async () => emitAuthChange({ access_token: 't3', user: { id: 'u2' } }));
    expect(queryClient.getQueryData(['memos'])).toBeUndefined();
  });

  test('falls back to signed-out when getSession throws', async () => {
    auth.getSession.mockRejectedValue(new Error('storage broken'));

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('signed-out')).toBeTruthy();
  });
});
