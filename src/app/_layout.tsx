import { QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider, useSession } from '@/features/auth/AuthProvider';
import { pendingShare } from '@/features/sharing/pendingShare';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  // 로그인 전에 열었던 공유 링크가 있으면 로그인 직후 이어서 가져온다.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    const token = pendingShare.take();
    if (token) router.push(`/share/${token}`);
  }, [userId]);

  if (isLoading) return null;

  const isSignedIn = session !== null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="share/[token]" />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
