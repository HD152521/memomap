import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { logger } from '@/lib/logger';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, isLoading: true });

  useEffect(() => {
    let isMounted = true;
    let currentUserId: string | null = null;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) logger.warn('getSession failed', { message: error.message });
        currentUserId = data.session?.user.id ?? null;
        if (isMounted) setState({ session: data.session, isLoading: false });
      })
      .catch((e: unknown) => {
        logger.error('getSession threw', { message: e instanceof Error ? e.message : String(e) });
        if (isMounted) setState({ session: null, isLoading: false });
      });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // 토큰 만료·다른 경로의 로그아웃·계정 전환 때도 이전 사용자의 메모 캐시가 남지 않게 한다.
      const nextUserId = session?.user.id ?? null;
      if (event === 'SIGNED_OUT' || nextUserId !== currentUserId) queryClient.clear();
      currentUserId = nextUserId;
      if (isMounted) setState({ session, isLoading: false });
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useSession must be used inside AuthProvider');
  return context;
}
