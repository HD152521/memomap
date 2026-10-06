import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '@/ui/theme';

import { UNGROUPED_COLOR } from './groupColors';
import type { MemoGroup } from './types';

type Props = {
  groups: MemoGroup[];
  value: string | null;
  onChange: (groupId: string | null) => void;
};

/** 메모 폼의 그룹 선택. 그룹이 없으면 안내만 보여준다. */
export function GroupPicker({ groups, value, onChange }: Props) {
  const options = [{ id: null, label: '분류 없음', color: UNGROUPED_COLOR }, ...groups.map((g) => ({ id: g.id, label: `${g.emoji} ${g.name}`, color: g.color }))];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>그룹</Text>
      {groups.length === 0 ? (
        <Text style={styles.hint}>메뉴(⋯) → 그룹 관리에서 맛집·꿀팁 같은 그룹을 만들 수 있어요</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <Pressable
                key={option.id ?? 'none'}
                testID={`group-option-${option.id ?? 'none'}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChange(option.id)}
                style={[styles.chip, isSelected ? { backgroundColor: option.color, borderColor: option.color } : styles.chipIdle]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs + 2 },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.inkMuted },
  hint: { fontSize: fontSize.caption + 1, color: colors.inkMuted },
  row: { gap: spacing.sm },
  chip: { height: 34, paddingHorizontal: spacing.md, borderRadius: 17, borderWidth: 1, justifyContent: 'center' },
  chipIdle: { backgroundColor: colors.surface, borderColor: colors.line },
  chipText: { fontSize: fontSize.caption + 1, fontWeight: '600', color: colors.ink },
  chipTextSelected: { color: colors.surface },
});
