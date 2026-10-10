import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { displayTitle } from './memoChips';
import { formatDistance, type NearbyMemo } from './nearby';

type Props = {
  items: NearbyMemo[];
  onPressMemo: (id: string) => void;
};

/** "지금 여기 근처" — 그 자리에 가면 다시 보이는 메모. 없으면 그리지 않는다. */
export function NearbyMemos({ items, onPressMemo }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.card} testID="nearby-memos">
      <Text style={styles.heading}>📍 지금 여기 근처 메모 {items.length}개</Text>
      {items.map(({ memo, distance }) => (
        <Pressable
          key={memo.id}
          testID={`nearby-${memo.id}`}
          accessibilityRole="button"
          onPress={() => onPressMemo(memo.id)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle(memo)}
          </Text>
          {memo.secretNote ? <Text style={styles.badge}>🔒</Text> : null}
          <Text style={styles.distance}>{formatDistance(distance)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heading: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.inkMuted, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  pressed: { opacity: 0.6 },
  title: { flex: 1, fontSize: fontSize.body, color: colors.ink },
  badge: { fontSize: fontSize.caption + 1 },
  distance: { fontSize: fontSize.caption + 1, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
});
