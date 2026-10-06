import type { NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '@/features/auth/signOut';
import { GroupFilterChips } from '@/features/groups/GroupFilterChips';
import { useGroups } from '@/features/groups/useGroups';
import { MemoMap, type Coord } from '@/features/map/MemoMap';
import { useMemos, type MemoFilter } from '@/features/memos/useMemos';
import { toAppError } from '@/lib/appError';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

const MY_LOCATION_ZOOM = 16;

export default function MapScreen() {
  const mapRef = useRef<NaverMapViewRef>(null);
  const [filter, setFilter] = useState<MemoFilter>('all');
  const { data: memos = [], error, refetch } = useMemos(filter);
  const { data: groups = [] } = useGroups();
  const groupColors = new Map(groups.map((group) => [group.id, group.color]));
  const [draft, setDraft] = useState<Coord | null>(null);
  // 그룹 필터 중이면 새 메모의 기본 그룹으로 쓴다. 삭제된 그룹이면 무시.
  const defaultGroupId = filter !== 'all' && filter !== 'none' && groupColors.has(filter) ? filter : undefined;

  const moveToMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('위치 권한이 필요해요', '설정에서 위치 권한을 허용하면 내 위치로 이동할 수 있어요.');
      return;
    }
    try {
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateCameraTo({ latitude: coords.latitude, longitude: coords.longitude, zoom: MY_LOCATION_ZOOM });
    } catch (e) {
      Alert.alert('현재 위치를 가져오지 못했어요', toAppError(e).userMessage);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('로그아웃할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => signOut().catch((e) => Alert.alert('로그아웃 실패', toAppError(e).userMessage)),
      },
    ]);
  };

  const openMenu = () => {
    Alert.alert('메뉴', undefined, [
      { text: '그룹 관리', onPress: () => router.push('/groups') },
      ...(__DEV__ ? [{ text: '[개발] 사진 위치 실험', onPress: () => router.push('/dev/photo-location') }] : []),
      { text: '로그아웃', style: 'destructive', onPress: confirmSignOut },
      { text: '닫기', style: 'cancel' },
    ]);
  };

  const addMemoAtDraft = () => {
    if (!draft) return;
    router.push({
      pathname: '/memo/new',
      params: { lat: String(draft.latitude), lng: String(draft.longitude), ...(defaultGroupId ? { groupId: defaultGroupId } : {}) },
    });
    setDraft(null);
  };

  return (
    <View style={styles.container}>
      <MemoMap ref={mapRef} memos={memos} groupColors={groupColors} draft={draft} onTapMap={setDraft} onTapMemo={(id) => router.push(`/memo/${id}`)} />

      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable accessibilityRole="search" onPress={() => router.push('/search')} style={({ pressed }) => [styles.searchBox, pressed && styles.pressed]}>
            <Text style={styles.searchPlaceholder}>🔍  장소 검색해서 메모하기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="메뉴" onPress={openMenu} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Text style={styles.iconText}>⋯</Text>
          </Pressable>
        </View>
        <GroupFilterChips groups={groups} value={filter} onChange={setFilter} />
      </SafeAreaView>

      {error && (
        <Pressable accessibilityRole="alert" onPress={() => refetch()} style={styles.errorBanner}>
          <Text style={styles.errorText}>{error.userMessage} · 탭해서 다시 시도</Text>
        </Pressable>
      )}

      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="내 위치로 이동" onPress={moveToMyLocation} style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
          <Text style={styles.iconText}>◎</Text>
        </Pressable>
        {draft ? (
          <View style={styles.draftCard}>
            <Text style={styles.draftTitle}>이 위치에 메모를 남길까요?</Text>
            <Text style={styles.draftCoord}>
              {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
            </Text>
            <View style={styles.draftActions}>
              <Button label="취소" variant="secondary" onPress={() => setDraft(null)} style={styles.flex} />
              <Button label="메모 추가" onPress={addMemoAtDraft} style={styles.flex} testID="add-memo-here" />
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>지도를 탭하면 그 위치에 메모를 남길 수 있어요</Text>
        )}
      </SafeAreaView>
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: spacing.sm },
  topBar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  searchBox: { flex: 1, height: 48, borderRadius: radius.lg, backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: spacing.lg, ...shadow },
  searchPlaceholder: { color: colors.inkMuted, fontSize: fontSize.body },
  iconButton: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  iconText: { fontSize: 22, color: colors.ink },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  errorBanner: { position: 'absolute', top: 160, alignSelf: 'center', backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  errorText: { color: colors.surface, fontSize: fontSize.caption + 1, fontWeight: '600' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  locationButton: { alignSelf: 'flex-end', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  hint: { alignSelf: 'center', color: colors.ink, backgroundColor: 'rgba(255,253,248,0.92)', paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.lg, fontSize: fontSize.caption + 1, overflow: 'hidden' },
  draftCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, ...shadow },
  draftTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.ink },
  draftCoord: { fontSize: fontSize.caption, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  draftActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
