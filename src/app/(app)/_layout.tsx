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
      <Stack.Screen name="groups/index" options={{ title: '그룹 관리' }} />
      <Stack.Screen name="groups/new" options={{ title: '새 그룹', presentation: 'modal' }} />
      <Stack.Screen name="groups/[id]/index" options={{ title: '그룹 편집' }} />
      <Stack.Screen name="groups/[id]/share" options={{ title: '그룹 공유' }} />
    </Stack>
  );
}
