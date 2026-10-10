import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { SEASONS, WEEKDAY_LABELS } from '../memoChips';

type Props = {
  months: number[];
  weekdays: number[];
  onChangeMonths: (months: number[]) => void;
  onChangeWeekdays: (weekdays: number[]) => void;
};

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const toggle = (list: number[], value: number) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** 🗓 시기: 계절(달 묶음)·달·요일. 아무것도 안 고르면 항상 보인다. */
export function SeasonPicker({ months, weekdays, onChangeMonths, onChangeWeekdays }: Props) {
  const toggleSeason = (seasonMonths: readonly number[]) => {
    const isAllOn = seasonMonths.every((m) => months.includes(m));
    onChangeMonths(isAllOn ? months.filter((m) => !seasonMonths.includes(m)) : [...new Set([...months, ...seasonMonths])]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.caption}>이 시기에만 지도에 보여요. 고르지 않으면 항상.</Text>
      <View style={styles.row}>
        {SEASONS.map((season) => (
          <Pill
            key={season.key}
            testID={`season-${season.key}`}
            label={season.label}
            isSelected={season.months.every((m) => months.includes(m))}
            onPress={() => toggleSeason(season.months)}
          />
        ))}
      </View>
      <View style={styles.row}>
        {ALL_MONTHS.map((month) => (
          <Pill key={month} testID={`month-${month}`} label={`${month}월`} isSelected={months.includes(month)} isSmall onPress={() => onChangeMonths(toggle(months, month))} />
        ))}
      </View>
      <View style={styles.row}>
        {WEEKDAY_LABELS.map((label, weekday) => (
          <Pill key={label} testID={`weekday-${weekday}`} label={label} isSelected={weekdays.includes(weekday)} isSmall onPress={() => onChangeWeekdays(toggle(weekdays, weekday))} />
        ))}
      </View>
    </View>
  );
}

function Pill({ label, isSelected, isSmall = false, onPress, testID }: { label: string; isSelected: boolean; isSmall?: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={[styles.pill, isSmall && styles.pillSmall, isSelected ? styles.pillOn : styles.pillOff]}
    >
      <Text style={[styles.pillText, isSelected && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  caption: { fontSize: fontSize.caption, color: colors.inkMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  pill: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  pillSmall: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  pillOff: { borderColor: colors.line, backgroundColor: colors.surface },
  pillOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  pillText: { fontSize: fontSize.caption + 1, color: colors.ink },
  pillTextOn: { color: colors.surface, fontWeight: '700' },
});
