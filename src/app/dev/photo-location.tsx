// [M0 스파이크 · 개발 빌드 전용] 사진에서 촬영 위치·날짜를 얻을 수 있는지 방식별로 실측한다.
// 결론이 나면 이 화면은 지우고 exifLocation.ts 만 남긴다.
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Asset, AssetField, MediaType, Query, requestPermissionsAsync } from 'expo-media-library';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { extractPhotoLocation, extractTakenAt } from '@/features/photoLocation/exifLocation';
import { toAppError } from '@/lib/appError';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

type Method = 'M1 시스템 선택기' | 'M2 레거시 선택기' | 'M3 보관함 직접';
type Row = { id: number; method: Method; location: string; takenAt: string; note: string };

const RECENT_LIMIT = 30;

function formatCoord(coord: { lat: number; lng: number } | null): string {
  return coord ? `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}` : '없음';
}

export default function PhotoLocationSpikeScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [assets, setAssets] = useState<{ asset: Asset; uri: string }[]>([]);
  const [permissionNote, setPermissionNote] = useState('');

  if (!__DEV__) return <Redirect href="/" />;

  const addRow = (row: Omit<Row, 'id'>) => setRows((prev) => [{ ...row, id: Date.now() }, ...prev]);

  const pickWith = async (method: Method, legacy: boolean) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], exif: true, legacy });
      if (result.canceled) return;
      const exif = result.assets[0]?.exif ?? null;
      addRow({
        method,
        location: formatCoord(extractPhotoLocation(exif)),
        takenAt: extractTakenAt(exif) ?? '없음',
        note: exif ? `EXIF 키 ${Object.keys(exif).length}개` : 'EXIF 없음',
      });
    } catch (e) {
      addRow({ method, location: '-', takenAt: '-', note: `오류: ${toAppError(e).userMessage}` });
    }
  };

  const loadLibrary = async () => {
    try {
      const permission = await requestPermissionsAsync(false, ['photo']);
      setPermissionNote(`권한: ${permission.status} / 범위: ${permission.accessPrivileges ?? '-'}`);
      if (!permission.granted) return;
      const recent = await new Query().eq(AssetField.MEDIA_TYPE, MediaType.IMAGE).orderBy({ key: AssetField.CREATION_TIME, ascending: false }).limit(RECENT_LIMIT).exe();
      setAssets(await Promise.all(recent.map(async (asset) => ({ asset, uri: await asset.getUri() }))));
    } catch (e) {
      setPermissionNote(`오류: ${toAppError(e).userMessage}`);
    }
  };

  const measureAsset = async (asset: Asset) => {
    try {
      const [location, created, exif] = await Promise.all([asset.getLocation(), asset.getCreationTime(), asset.getExif().catch(() => null)]);
      const exifCoord = extractPhotoLocation(exif);
      addRow({
        method: 'M3 보관함 직접',
        location: location ? formatCoord({ lat: location.latitude, lng: location.longitude }) : `getLocation 없음 · EXIF ${formatCoord(exifCoord)}`,
        takenAt: created ? new Date(created).toISOString() : (extractTakenAt(exif) ?? '없음'),
        note: permissionNote,
      });
    } catch (e) {
      addRow({ method: 'M3 보관함 직접', location: '-', takenAt: '-', note: `오류: ${toAppError(e).userMessage}` });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>사진 위치 실험</Text>
        <Text style={styles.muted}>
          {Platform.OS} {String(Platform.Version)} · 위치 태그를 켜고 찍은 사진으로 세 방식을 모두 눌러 보세요.
        </Text>

        <View style={styles.buttons}>
          <Button label="M1 시스템 선택기로 고르기" onPress={() => pickWith('M1 시스템 선택기', false)} />
          <Button label="M2 레거시 선택기로 고르기" variant="secondary" onPress={() => pickWith('M2 레거시 선택기', true)} />
          <Button label="M3 보관함 불러오기 (권한 요청)" variant="secondary" onPress={loadLibrary} />
        </View>

        {permissionNote !== '' && <Text style={styles.muted}>{permissionNote}</Text>}
        {assets.length > 0 && (
          <FlatList
            data={assets}
            horizontal
            keyExtractor={(item) => item.asset.id}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" accessibilityLabel="이 사진 측정" onPress={() => measureAsset(item.asset)}>
                <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
              </Pressable>
            )}
          />
        )}

        <Text style={styles.section}>결과 (최신순) — 스크린샷으로 공유해 주세요</Text>
        {rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.method}>{row.method}</Text>
            <Text style={styles.value}>위치: {row.location}</Text>
            <Text style={styles.value}>촬영: {row.takenAt}</Text>
            <Text style={styles.muted}>{row.note}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: fontSize.hero, fontWeight: '800', color: colors.ink },
  muted: { fontSize: fontSize.caption + 1, color: colors.inkMuted },
  buttons: { gap: spacing.sm },
  grid: { gap: spacing.xs },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
  section: { marginTop: spacing.md, fontSize: fontSize.body, fontWeight: '700', color: colors.ink },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 2, borderWidth: 1, borderColor: colors.line },
  method: { fontWeight: '700', color: colors.ink },
  value: { color: colors.ink, fontVariant: ['tabular-nums'] },
});
