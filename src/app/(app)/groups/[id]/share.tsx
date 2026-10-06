import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';

import { useGroups } from '@/features/groups/useGroups';
import { firstParam } from '@/features/memos/routeParams';
import { shareRepository } from '@/features/sharing/shareRepository';
import { useCreateShare, useRevokeShare } from '@/features/sharing/useShare';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

export default function ShareGroupScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string }>().id) ?? '';
  const { data: groups = [] } = useGroups();
  const group = groups.find((item) => item.id === id);
  const { data: photoCount } = useQuery({ queryKey: ['groups', id, 'photoCount'], queryFn: () => shareRepository.photoCount(id), enabled: !!group });
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();

  if (!group) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>삭제되었거나 없는 그룹이에요</Text>
        <Button label="돌아가기" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const shareLink = () => {
    createShare.mutate(group.id, {
      onSuccess: (url) => {
        Share.share({ message: `${group.emoji} ${group.name} 메모를 공유했어요. 메모 지도 앱에서 열면 바로 저장돼요.\n${url}` }).catch(() => undefined);
      },
      onError: (e) => Alert.alert('링크를 만들지 못했어요', e.userMessage),
    });
  };

  const confirmRevoke = () => {
    Alert.alert('공유 링크를 끌까요?', '이미 보낸 링크로는 더 이상 가져갈 수 없어요. 이미 가져간 사람의 메모는 지워지지 않아요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '링크 끄기',
        style: 'destructive',
        onPress: () =>
          revokeShare.mutate(group.id, {
            onSuccess: () => Alert.alert('링크를 껐어요'),
            onError: (e) => Alert.alert('링크를 끄지 못했어요', e.userMessage),
          }),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: group.color }]}>
        <Text style={styles.title}>
          {group.emoji} {group.name}
        </Text>
        <Text style={styles.stats}>
          메모 {group.memoCount}개 · 사진 {photoCount ?? '…'}장
        </Text>
      </View>

      <View style={styles.warning} accessibilityRole="alert">
        <Text style={styles.warningTitle}>⚠ 메모 본문과 사진이 그대로 공유돼요</Text>
        <Text style={styles.warningBody}>
          링크를 받은 사람이 앱에서 열면 이 그룹이 그 사람 지도에 바로 저장돼요. 화장실 비밀번호처럼 남에게 알리고 싶지 않은 내용이 있는지 확인해 주세요.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="링크 만들어 보내기" onPress={shareLink} isLoading={createShare.isPending} testID="create-share" />
        <Button label="링크 끄기" variant="secondary" onPress={confirmRevoke} isLoading={revokeShare.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.paper },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  muted: { color: colors.inkMuted, textAlign: 'center' },
  card: { borderWidth: 2, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface, gap: spacing.xs },
  title: { fontSize: fontSize.hero, fontWeight: '800', color: colors.ink },
  stats: { fontSize: fontSize.body, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  warning: { borderRadius: radius.md, padding: spacing.lg, backgroundColor: '#FFF4E5', gap: spacing.xs },
  warningTitle: { fontSize: fontSize.body, fontWeight: '700', color: '#8A4B00' },
  warningBody: { fontSize: fontSize.caption + 1, lineHeight: 19, color: '#6B3A00' },
  actions: { gap: spacing.sm },
});
