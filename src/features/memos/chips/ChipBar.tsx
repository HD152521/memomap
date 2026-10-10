import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';

export type ChipKey = 'secret' | 'season' | 'photo' | 'promise' | 'group' | 'detail';

export const CHIPS: { key: ChipKey; icon: string; label: string }[] = [
  { key: 'secret', icon: '🔒', label: '비번' },
  { key: 'season', icon: '🗓', label: '시기' },
  { key: 'photo', icon: '📷', label: '사진' },
  { key: 'promise', icon: '👥', label: '약속' },
  { key: 'group', icon: '🏷', label: '그룹' },
  { key: 'detail', icon: '✏️', label: '자세히' },
];

type Props = {
  open: ReadonlySet<ChipKey>;
  onToggle: (key: ChipKey) => void;
};

/** 한 줄 메모 아래 "필요할 때만" 붙이는 칩. 켜면 그 칸이 열리고, 끄면 값이 지워진다. */
export function ChipBar({ open, onToggle }: Props) {
  return (
    <View style={styles.row}>
      {CHIPS.map((chip) => {
        const isOpen = open.has(chip.key);
        return (
          <Pressable
            key={chip.key}
            testID={`chip-${chip.key}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: isOpen }}
            accessibilityLabel={chip.label}
            onPress={() => onToggle(chip.key)}
            style={({ pressed }) => [styles.chip, isOpen ? styles.chipOn : styles.chipOff, pressed && styles.pressed]}
          >
            <Text style={[styles.text, isOpen && styles.textOn]}>
              {isOpen ? chip.icon : `+ ${chip.icon}`} {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 3 },
  chipOff: { borderColor: colors.line, backgroundColor: colors.surface, borderStyle: 'dashed' },
  chipOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  text: { fontSize: fontSize.caption + 1, color: colors.ink },
  textOn: { color: colors.surface, fontWeight: '700' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
