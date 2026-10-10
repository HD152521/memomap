import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth/AuthProvider';
import { SecretReveal } from '@/features/memos/chips/SecretReveal';
import { displayTitle, formatPromiseDates, promiseLabel, promisePhase } from '@/features/memos/memoChips';
import { firstParam } from '@/features/memos/routeParams';
import { useCreateMemo } from '@/features/memos/useMemos';
import { usePromiseView } from '@/features/promise/usePromise';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

/**
 * memomap://promise/{token} — 웹 뷰어의 "앱에 저장"으로 들어온다. Stack.Protected 바깥이라 로그인 전에도 열린다.
 * 저장하면 내 메모로 복사된다(이후 원본 수정은 따라오지 않음).
 */
export default function PromiseLinkScreen() {
  const token = firstParam(useLocalSearchParams<{ token: string }>().token) ?? '';
  const { session } = useSession();
  const { data: view, error, isLoading } = usePromiseView(token);
  const createMemo = useCreateMemo();

  if (isLoading) return <ActivityIndicator style={styles.center} color={colors.accent} />;

  if (error || !view) {
    return (
      <SafeAreaView style={styles.centerBox}>
        <Text style={styles.heading}>열 수 없는 약속이에요</Text>
        <Text style={styles.muted}>{error?.userMessage ?? '링크를 다시 받아 주세요'}</Text>
        <Button label="닫기" variant="secondary" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const phase = promisePhase(view, new Date());

  const save = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    createMemo.mutate(
      {
        title: view.title,
        address: view.address,
        body: view.body,
        lat: view.lat,
        lng: view.lng,
        naverPlaceId: null,
        secretNote: view.secretNote,
        promiseStart: view.promiseStart,
        promiseEnd: view.promiseEnd,
      },
      {
        onSuccess: (memo) => router.replace(`/memo/${memo.id}`),
        onError: (e) => Alert.alert('저장하지 못했어요', e.userMessage),
      },
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {phase && <Text style={styles.badge}>{promiseLabel(phase)}</Text>}
        <Text style={styles.heading}>{displayTitle(view)}</Text>
        <Text style={styles.dates}>{formatPromiseDates(view)}</Text>
        {view.address && <Text style={styles.muted}>{view.address}</Text>}
        {view.secretNote && <SecretReveal secret={view.secretNote} />}
        {view.isSecretHidden && <Text style={styles.muted}>🔒 지난 약속이라 비번은 가렸어요.</Text>}
        {view.body ? (
          <View style={styles.card}>
            <Text style={styles.body}>{view.body}</Text>
          </View>
        ) : null}
        <Button label={session ? '내 지도에 저장' : '로그인하고 저장'} onPress={save} isLoading={createMemo.isPending} testID="promise-save" />
        <Button label="닫기" variant="secondary" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1 },
  centerBox: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.paper },
  content: { padding: spacing.lg, gap: spacing.md },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    color: colors.surface,
    fontWeight: '800',
    fontSize: fontSize.caption + 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  heading: { fontSize: fontSize.hero, fontWeight: '800', color: colors.ink },
  dates: { fontSize: fontSize.title, fontWeight: '700', color: colors.ink },
  muted: { fontSize: fontSize.body, color: colors.inkMuted },
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  body: { fontSize: fontSize.body + 1, lineHeight: 24, color: colors.ink },
});
