import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useGroups } from '@/features/groups/useGroups';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

export default function GroupListScreen() {
  const { data: groups = [], isLoading, error, refetch } = useGroups();

  if (isLoading) return <ActivityIndicator style={styles.center} color={colors.accent} />;

  return (
    <View style={styles.container}>
      {error && (
        <Pressable accessibilityRole="alert" onPress={() => refetch()} style={styles.errorBox}>
          <Text style={styles.error}>{error.userMessage} · 탭해서 다시 시도</Text>
        </Pressable>
      )}
      <FlatList
        data={groups}
        keyExtractor={(group) => group.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>아직 그룹이 없어요.{'\n'}맛집, 꿀팁, 계곡처럼 메모를 묶어 보세요.</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/groups/${item.id}`)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.name}>
              {item.emoji} {item.name}
            </Text>
            {item.sourceShareId && <Text style={styles.badge}>공유받음</Text>}
            <Text style={styles.count}>{item.memoCount}</Text>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Button label="+ 새 그룹" onPress={() => router.push('/groups/new')} testID="new-group" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.85 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, fontSize: fontSize.body + 1, fontWeight: '600', color: colors.ink },
  badge: {
    fontSize: fontSize.caption,
    color: colors.inkMuted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  count: { fontSize: fontSize.body, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  empty: { marginTop: spacing.xxl, textAlign: 'center', color: colors.inkMuted, lineHeight: 22 },
  footer: { padding: spacing.lg },
  errorBox: { margin: spacing.lg, marginBottom: 0 },
  error: { color: colors.danger, textAlign: 'center' },
});
