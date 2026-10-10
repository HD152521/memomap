import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGroupMap, useGroups } from '@/features/groups/useGroups';
import { SecretReveal } from '@/features/memos/chips/SecretReveal';
import { displayTitle, seasonSummary } from '@/features/memos/memoChips';
import { MemoForm } from '@/features/memos/MemoForm';
import { firstParam, isUuid } from '@/features/memos/routeParams';
import { useDeleteMemo, useMemoDetail, useUpdateMemo } from '@/features/memos/useMemos';
import { PhotoCarousel } from '@/features/photos/PhotoCarousel';
import { photoRepository } from '@/features/photos/photoRepository';
import { photoKeys, useMemoPhotos } from '@/features/photos/usePhotos';
import { PromiseCard } from '@/features/promise/PromiseCard';
import { Button } from '@/ui/Button';
import { colors, fontSize, spacing } from '@/ui/theme';

const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

export default function MemoDetailScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string }>().id) ?? '';
  const { data: memo, isLoading, error, refetch } = useMemoDetail(id);
  const updateMemo = useUpdateMemo(id);
  const deleteMemo = useDeleteMemo();
  const [isEditing, setIsEditing] = useState(false);
  const { data: photos = [], isLoading: isPhotosLoading, isError: isPhotosError } = useMemoPhotos(id);
  const { data: groups = [] } = useGroups();
  const groupMap = useGroupMap();
  const queryClient = useQueryClient();

  const isValidId = isUuid(id);

  if (isValidId && isLoading) return <ActivityIndicator style={styles.center} color={colors.accent} />;

  if (!isValidId || error || !memo) {
    const canRetry = isValidId && error !== null && error.code !== 'NOT_FOUND';
    return (
      <View style={styles.centerBox}>
        <Text style={styles.muted}>{isValidId ? (error?.userMessage ?? '메모를 불러오지 못했어요') : '삭제되었거나 없는 메모예요'}</Text>
        {canRetry && <Button label="다시 시도" variant="secondary" onPress={() => refetch()} />}
        <Button label="지도로 돌아가기" variant="secondary" onPress={() => router.dismissTo('/')} />
      </View>
    );
  }

  if (isEditing) {
    return (
      <>
        <Stack.Screen options={{ title: '메모 수정' }} />
        <MemoForm
          initial={memo}
          coord={{ lat: memo.lat, lng: memo.lng }}
          naverPlaceId={memo.naverPlaceId}
          groups={groups}
          existingPhotos={photos}
          submitLabel="수정 완료"
          onSubmit={async (values, photoChanges) => {
            await updateMemo.mutateAsync(values);
            const { failedUploads } = await photoRepository.applyChanges(memo.id, photos, photoChanges);
            await queryClient.invalidateQueries({ queryKey: photoKeys.byMemo(memo.id) });
            if (failedUploads > 0) Alert.alert('메모는 저장했어요', `사진 ${failedUploads}장을 올리지 못했어요. 다시 추가해 주세요.`);
            setIsEditing(false);
          }}
        />
      </>
    );
  }

  const group = memo.groupId ? groupMap.get(memo.groupId) : undefined;
  const season = seasonSummary(memo);
  const title = displayTitle(memo);

  const confirmDelete = () => {
    Alert.alert('메모를 삭제할까요?', '삭제한 메모는 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deleteMemo.mutate(memo.id, {
            onSuccess: () => router.dismissTo('/'),
            onError: (e) => Alert.alert('삭제하지 못했어요', e.userMessage),
          }),
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />
      {group && (
        <Text style={[styles.groupBadge, { backgroundColor: group.color }]}>
          {group.emoji} {group.name}
        </Text>
      )}
      <Text style={[styles.title, !memo.title.trim() && styles.untitled]}>{title}</Text>
      {memo.address && <Text style={styles.muted}>{memo.address}</Text>}
      {season && <Text style={styles.season}>🗓 {season}에만 지도에 보여요</Text>}
      {memo.secretNote && <SecretReveal secret={memo.secretNote} />}
      <PromiseCard memo={memo} />
      <PhotoCarousel photos={photos} />
      {memo.body ? <Text style={styles.body}>{memo.body}</Text> : null}
      <Text style={styles.meta}>수정 {DATE_FORMAT.format(new Date(memo.updatedAt))}</Text>
      <View style={styles.actions}>
        {/* 사진 목록이 와야 빈 자리(position)를 바르게 계산할 수 있다. */}
        <Button label="수정" variant="secondary" onPress={() => setIsEditing(true)} disabled={isPhotosLoading || isPhotosError} style={styles.flex} />
        <Button label="삭제" variant="danger" onPress={confirmDelete} isLoading={deleteMemo.isPending} style={styles.flex} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1 },
  centerBox: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.lg, gap: spacing.md },
  groupBadge: {
    alignSelf: 'flex-start',
    color: colors.surface,
    fontWeight: '700',
    fontSize: fontSize.caption + 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    overflow: 'hidden',
  },
  title: { fontSize: fontSize.hero, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  untitled: { color: colors.inkMuted },
  season: { fontSize: fontSize.body, color: colors.ink },
  muted: { color: colors.inkMuted, fontSize: fontSize.body, textAlign: 'left' },
  body: { marginTop: spacing.md, fontSize: fontSize.body + 1, lineHeight: 24, color: colors.ink },
  meta: { marginTop: spacing.lg, fontSize: fontSize.caption, color: colors.inkMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
});
