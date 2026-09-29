import { Stack } from 'expo-router';

import { colors } from '@/ui/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.paper },
        contentStyle: { backgroundColor: colors.paper },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ title: '장소 검색' }} />
      <Stack.Screen name="memo/new" options={{ title: '새 메모', presentation: 'modal' }} />
      <Stack.Screen name="memo/[id]" options={{ title: '메모' }} />
    </Stack>
  );
}
