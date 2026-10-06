import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { MemoFilter } from '@/features/memos/useMemos';
import { colors, fontSize, spacing } from '@/ui/theme';

import { UNGROUPED_COLOR } from './groupColors';
import type { MemoGroup } from './types';

type Props = {
  groups: MemoGroup[];
  value: MemoFilter;
  onChange: (filter: MemoFilter) => void;
};

type Chip = { key: MemoFilter; label: string; color: string };

export function GroupFilterChips({ groups, value, onChange }: Props) {
  // 그룹이 없으면 고를 것이 없으므로 칩을 숨긴다.
  if (groups.length === 0) return null;

  const chips: Chip[] = [
    { key: 'all', label: '전체', color: colors.ink },
    ...groups.map((group) => ({ key: group.id, label: `${group.emoji} ${group.name}`, color: group.color })),
    { key: 'none', label: '분류 없음', color: UNGROUPED_COLOR },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {chips.map((chip) => {
        const isSelected = chip.key === value;
        return (
          <Pressable
            key={chip.key}
            testID={`filter-chip-${chip.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(chip.key)}
            style={({ pressed }) => [
              styles.chip,
              isSelected ? { backgroundColor: chip.color, borderColor: chip.color } : styles.chipIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  chip: { height: 34, paddingHorizontal: spacing.md, borderRadius: 17, borderWidth: 1, justifyContent: 'center' },
  chipIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: fontSize.caption + 1, fontWeight: '600', color: colors.ink },
  labelSelected: { color: colors.surface },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});

