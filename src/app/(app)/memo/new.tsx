import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { MemoForm } from '@/features/memos/MemoForm';
import { firstParam, parseCoordParams } from '@/features/memos/routeParams';
import { useCreateMemo } from '@/features/memos/useMemos';
import { Button } from '@/ui/Button';
import { colors, spacing } from '@/ui/theme';

type Params = { lat?: string; lng?: string; title?: string; address?: string };

export default function NewMemoScreen() {
  const params = useLocalSearchParams<Params>();
  const coord = parseCoordParams(params);
  const createMemo = useCreateMemo();

  if (!coord) {
    return (
      <View style={styles.invalid}>
        <Text style={styles.invalidText}>위치 정보가 올바르지 않아요.</Text>
        <Button label="돌아가기" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <MemoForm
      initial={{ title: firstParam(params.title), address: firstParam(params.address) }}
      coord={coord}
      submitLabel="저장"
      onSubmit={async (values) => {
        await createMemo.mutateAsync(values);
        router.dismissTo('/');
      }}
    />
  );
}

const styles = StyleSheet.create({
  invalid: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  invalidText: { textAlign: 'center', color: colors.inkMuted },
});
