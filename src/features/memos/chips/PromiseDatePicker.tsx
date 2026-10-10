import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { kstParts, WEEKDAY_LABELS } from '../memoChips';
import { PROMISE_MAX_DAYS } from '../memoSchema';

const DAY_MS = 24 * 60 * 60 * 1000;
const PICKABLE_DAYS = 120;

type Props = {
  start: string | null;
  /** 1 = 당일, 2 = 1박 2일 … */
  days: number;
  onChangeStart: (isoDate: string) => void;
  onChangeDays: (days: number) => void;
  /** 테스트용 기준 시각 */
  now?: Date;
};

export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysLabel(days: number): string {
  return days <= 1 ? '당일' : `${days - 1}박 ${days}일`;
}

/** 👥 약속 날짜: 오늘부터 고르는 날짜 줄 + 기간(당일 / n박). 시작이 지난 약속을 고칠 때는 그 날짜도 목록에 둔다. */
export function PromiseDatePicker({ start, days, onChangeStart, onChangeDays, now = new Date() }: Props) {
  const today = kstParts(now).isoDate;
  const dates = useMemo(() => {
    const upcoming = Array.from({ length: PICKABLE_DAYS }, (_, i) => addDays(today, i));
    return start && start < today ? [start, ...upcoming] : upcoming;
  }, [today, start]);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
        {dates.map((iso) => {
          const date = new Date(`${iso}T00:00:00Z`);
          const weekday = date.getUTCDay();
          const isSelected = iso === start;
          return (
            <Pressable
              key={iso}
              testID={`promise-date-${iso}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChangeStart(iso)}
              style={[styles.date, isSelected ? styles.dateOn : styles.dateOff]}
            >
              <Text style={[styles.dateWeekday, weekday === 0 && styles.sunday, weekday === 6 && styles.saturday, isSelected && styles.textOn]}>
                {iso === today ? '오늘' : WEEKDAY_LABELS[weekday]}
              </Text>
              <Text style={[styles.dateDay, isSelected && styles.textOn]}>{`${date.getUTCMonth() + 1}/${date.getUTCDate()}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.stepper}>
        <StepButton label="−" testID="promise-days-minus" disabled={days <= 1} onPress={() => onChangeDays(days - 1)} />
        <Text style={styles.days} testID="promise-days">
          {daysLabel(days)}
        </Text>
        <StepButton label="+" testID="promise-days-plus" disabled={days > PROMISE_MAX_DAYS} onPress={() => onChangeDays(days + 1)} />
      </View>
      <Text style={styles.caption}>저장하면 링크로 공유할 수 있어요. 받는 사람은 앱이 없어도 돼요.</Text>
    </View>
  );
}

function StepButton({ label, disabled, onPress, testID }: { label: string; disabled: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.step, disabled && styles.stepDisabled]}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  dates: { gap: spacing.xs + 2 },
  date: { width: 52, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', paddingVertical: spacing.xs + 2, gap: 2 },
  dateOff: { borderColor: colors.line, backgroundColor: colors.surface },
  dateOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  dateWeekday: { fontSize: fontSize.caption, color: colors.inkMuted },
  dateDay: { fontSize: fontSize.body, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  sunday: { color: '#D0574A' },
  saturday: { color: '#4A78C2' },
  textOn: { color: colors.surface },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  stepDisabled: { opacity: 0.4 },
  stepText: { fontSize: fontSize.title, color: colors.ink },
  days: { minWidth: 72, textAlign: 'center', fontSize: fontSize.body, fontWeight: '700', color: colors.ink },
  caption: { fontSize: fontSize.caption, color: colors.inkMuted },
});
