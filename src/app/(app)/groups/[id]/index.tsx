import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { GroupForm } from '@/features/groups/GroupForm';
import { useDeleteGroup, useGroups, useUpdateGroup } from '@/features/groups/useGroups';
import { firstParam } from '@/features/memos/routeParams';
import { Button } from '@/ui/Button';
import { colors, spacing } from '@/ui/theme';

export default function EditGroupScreen() {
  const id = firstParam(useLocalSearchParams<{ id: string }>().id) ?? '';
  const { data: groups = [] } = useGroups();
  const group = groups.find((item) => item.id === id);
  const updateGroup = useUpdateGroup(id);
  const deleteGroup = useDeleteGroup();

  if (!group) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>삭제되었거나 없는 그룹이에요</Text>
        <Button label="돌아가기" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert(`"${group.name}" 그룹을 삭제할까요?`, `메모 ${group.memoCount}개는 지워지지 않고 '분류 없음'으로 옮겨져요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deleteGroup.mutate(group.id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('삭제하지 못했어요', e.userMessage),
          }),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <GroupForm
        initial={group}
        submitLabel="저장"
        onSubmit={async (values) => {
          await updateGroup.mutateAsync(values);
          router.back();
        }}
      />
      <View style={styles.actions}>
        <Button label="이 그룹 공유하기" variant="secondary" onPress={() => router.push(`/groups/${group.id}/share`)} testID="share-group" />
        <Button label="그룹 삭제" variant="danger" onPress={confirmDelete} isLoading={deleteGroup.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  muted: { color: colors.inkMuted, textAlign: 'center' },
  actions: { padding: spacing.lg, gap: spacing.sm },
});
