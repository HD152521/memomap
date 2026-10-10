import { Alert, Share, StyleSheet, Text, View } from 'react-native';

import { formatPromiseDates, promiseLabel, promisePhase } from '@/features/memos/memoChips';
import type { Memo } from '@/features/memos/types';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { promiseShareMessage } from './promiseRepository';
import { useCreatePromiseShare, useRevokePromiseShare } from './usePromise';

type Props = { memo: Memo; now?: Date };

/** 👥 약속 메모 상세: 날짜·D-day와 링크 공유/끄기. */
export function PromiseCard({ memo, now = new Date() }: Props) {
  const createShare = useCreatePromiseShare();
  const revokeShare = useRevokePromiseShare();
  const phase = promisePhase(memo, now);
  if (!phase) return null;

  const share = () => {
    createShare.mutate(memo.id, {
      onSuccess: (token) => {
        Share.share({ message: promiseShareMessage(memo, token) }).catch(() => undefined);
      },
      onError: (e) => Alert.alert('링크를 만들지 못했어요', e.userMessage),
    });
  };

  const confirmRevoke = () => {
    Alert.alert('약속 링크를 끌까요?', '이미 보낸 링크로는 더 이상 열 수 없어요. 다시 공유하면 새 링크가 만들어져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '링크 끄기',
        style: 'destructive',
        onPress: () =>
          revokeShare.mutate(memo.id, {
            onSuccess: () => Alert.alert('링크를 껐어요'),
            onError: (e) => Alert.alert('링크를 끄지 못했어요', e.userMessage),
          }),
      },
    ]);
  };

  const isEnded = phase.kind === 'ended';

  return (
    <View style={styles.card} testID="promise-card">
      <View style={styles.header}>
        <Text style={styles.label}>👥 약속</Text>
        <Text style={[styles.badge, isEnded ? styles.badgeEnded : styles.badgeActive]} testID="promise-phase">
          {promiseLabel(phase)}
        </Text>
      </View>
      <Text style={styles.dates}>{formatPromiseDates(memo)}</Text>
      <Text style={styles.hint}>
        {isEnded ? '지난 약속이에요. 링크에서 비번은 이미 가려졌어요.' : '링크를 단톡방에 올려두면 "어디야?"에 답할 필요가 없어요. 수정하면 링크에도 바로 반영돼요.'}
      </Text>
      <View style={styles.actions}>
        <Button label="링크 공유" onPress={share} isLoading={createShare.isPending} style={styles.flex} testID="promise-share" />
        <Button label="링크 끄기" variant="secondary" onPress={confirmRevoke} isLoading={revokeShare.isPending} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.inkMuted },
  badge: { fontSize: fontSize.caption + 1, fontWeight: '800', paddingHorizontal: spacing.sm + 2, paddingVertical: 2, borderRadius: radius.lg, overflow: 'hidden' },
  badgeActive: { backgroundColor: colors.accent, color: colors.surface },
  badgeEnded: { backgroundColor: colors.line, color: colors.inkMuted },
  dates: { fontSize: fontSize.title, fontWeight: '700', color: colors.ink },
  hint: { fontSize: fontSize.caption, color: colors.inkMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
});
