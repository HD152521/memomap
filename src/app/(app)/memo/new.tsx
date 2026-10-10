import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useGroups } from '@/features/groups/useGroups';
import { MemoForm } from '@/features/memos/MemoForm';
import { firstParam, isUuid, parseCoordParams } from '@/features/memos/routeParams';
import { useCreateMemo } from '@/features/memos/useMemos';
import { photoRepository } from '@/features/photos/photoRepository';
import { photoKeys } from '@/features/photos/usePhotos';
import { Button } from '@/ui/Button';
import { colors, spacing } from '@/ui/theme';

type Params = { lat?: string; lng?: string; title?: string; address?: string; groupId?: string };

export default function NewMemoScreen() {
  const params = useLocalSearchParams<Params>();
  const coord = parseCoordParams(params);
  const createMemo = useCreateMemo();
  const queryClient = useQueryClient();
  const { data: groups = [], isLoading: isGroupsLoading } = useGroups();
  const initialGroupId = firstParam(params.groupId);

  if (!coord) {
    return (
      <View style={styles.invalid}>
        <Text style={styles.invalidText}>위치 정보가 올바르지 않아요.</Text>
        <Button label="돌아가기" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  // 그룹 목록이 와야 기본 그룹을 올바르게 고를 수 있다.
  if (isGroupsLoading) return null;

  return (
    <MemoForm
      initial={{
        title: firstParam(params.title),
        address: firstParam(params.address),
        groupId: isUuid(initialGroupId) ? initialGroupId : null,
      }}
      coord={coord}
      groups={groups}
      submitLabel="저장"
      autoFocus
      onSubmit={async (values, photos) => {
        const memo = await createMemo.mutateAsync(values);
        const { failedUploads } = await photoRepository.applyChanges(memo.id, [], photos);
        await queryClient.invalidateQueries({ queryKey: photoKeys.byMemo(memo.id) });
        if (failedUploads > 0) Alert.alert('메모는 저장했어요', `사진 ${failedUploads}장을 올리지 못했어요. 메모를 열어 다시 추가해 주세요.`);
        router.dismissTo('/');
      }}
    />
  );
}

const styles = StyleSheet.create({
  invalid: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  invalidText: { textAlign: 'center', color: colors.inkMuted },
});
