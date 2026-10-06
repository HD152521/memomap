import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth/AuthProvider';
import { firstParam } from '@/features/memos/routeParams';
import { pendingShare } from '@/features/sharing/pendingShare';
import { isValidShareToken } from '@/features/sharing/shareToken';
import { useImportShare, useUndoImport } from '@/features/sharing/useShare';
import { Button } from '@/ui/Button';
import { colors, fontSize, spacing } from '@/ui/theme';

/** memomap://share/{token} — Stack.Protected 바깥 루트 라우트라 로그인 전에도 열린다. */
export default function ShareLinkScreen() {
  const token = firstParam(useLocalSearchParams<{ token: string }>().token) ?? '';
  const { session } = useSession();
  const importShare = useImportShare();
  const startImport = importShare.mutate;
  const undoImport = useUndoImport();
  // 이 화면이 다른 토큰으로 재사용될 수 있으므로 '어느 토큰을 시작했는지'를 기억한다.
  const startedTokenRef = useRef<string | null>(null);
  const [isUndone, setIsUndone] = useState(false);
  const isValid = isValidShareToken(token);

  useEffect(() => {
    if (!isValid) return;
    if (!session) {
      pendingShare.set(token);
      return;
    }
    // 로그인 상태에서 링크를 열면 확인 없이 바로 저장한다(D5). StrictMode 이중 실행 방지.
    if (startedTokenRef.current === token) return;
    startedTokenRef.current = token;
    setIsUndone(false);
    startImport(token);
  }, [isValid, session, token, startImport]);

  if (!isValid) {
    return <Message title="열 수 없는 링크예요" body="링크 주소가 올바르지 않아요." />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (importShare.isError) {
    return <Message title="가져오지 못했어요" body={importShare.error.userMessage} />;
  }

  const result = importShare.data;
  if (!result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>공유받은 메모를 내 지도에 저장하는 중…</Text>
      </View>
    );
  }

  if (isUndone) {
    return <Message title="되돌렸어요" body={`"${result.groupName}" 그룹과 메모를 지웠어요.`} />;
  }

  const verb = result.mode === 'created' ? '저장했어요' : '최신 내용으로 업데이트했어요';
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.check}>✅</Text>
        <Text style={styles.title}>
          &quot;{result.groupName}&quot;을(를) {verb}
        </Text>
        <Text style={styles.stats}>
          메모 {result.memoCount}개 · 사진 {result.photoCount}장
        </Text>
        {result.skippedPhotos > 0 && <Text style={styles.muted}>사진 {result.skippedPhotos}장은 가져오지 못했어요.</Text>}
        {result.mode === 'updated' && <Text style={styles.muted}>내가 직접 추가한 메모는 그대로 두었어요.</Text>}
      </View>
      <View style={styles.actions}>
        <Button label="지도에서 보기" onPress={() => router.replace('/')} testID="share-go-map" />
        {result.mode === 'created' && (
          <Button
            label="되돌리기"
            variant="secondary"
            isLoading={undoImport.isPending}
            onPress={() => undoImport.mutate({ token, groupId: result.groupId }, { onSuccess: () => setIsUndone(true) })}
            testID="share-undo"
          />
        )}
        {undoImport.isError && <Text style={styles.error}>{undoImport.error.userMessage}</Text>}
      </View>
    </SafeAreaView>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{body}</Text>
      </View>
      <View style={styles.actions}>
        <Button label="지도로 가기" variant="secondary" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.paper },
  body: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  check: { fontSize: 44 },
  title: { fontSize: fontSize.hero - 4, fontWeight: '800', color: colors.ink },
  stats: { fontSize: fontSize.body + 1, color: colors.ink, fontVariant: ['tabular-nums'] },
  muted: { fontSize: fontSize.body, color: colors.inkMuted, textAlign: 'left' },
  actions: { gap: spacing.sm, paddingBottom: spacing.xxl },
  error: { color: colors.danger, textAlign: 'center' },
});
