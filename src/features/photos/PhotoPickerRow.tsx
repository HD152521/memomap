import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { MAX_PHOTOS_PER_MEMO, type LocalPhoto, type MemoPhoto } from './types';

type Props = {
  existing: MemoPhoto[];
  added: LocalPhoto[];
  removedIds: ReadonlySet<string>;
  onAdd: (photos: LocalPhoto[]) => void;
  onRemoveExisting: (photo: MemoPhoto) => void;
  onRemoveAdded: (localId: string) => void;
};

type Thumb = { key: string; uri: string | null; onRemove: () => void };

const THUMB_SIZE = 72;

export function PhotoPickerRow({ existing, added, removedIds, onAdd, onRemoveExisting, onRemoveAdded }: Props) {
  const kept = existing.filter((photo) => !removedIds.has(photo.id));
  const remaining = MAX_PHOTOS_PER_MEMO - kept.length - added.length;

  const thumbs: Thumb[] = [
    ...kept.map((photo) => ({ key: photo.id, uri: photo.url, onRemove: () => onRemoveExisting(photo) })),
    ...added.map((photo) => ({ key: photo.localId, uri: photo.uri, onRemove: () => onRemoveAdded(photo.localId) })),
  ];

  const pick = async () => {
    // Android 13+/iOS 14+ 시스템 사진 선택기는 별도 권한 없이 고른 사진만 앱에 넘긴다.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    onAdd(
      result.assets.slice(0, remaining).map((asset) => ({
        localId: Crypto.randomUUID(),
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      })),
    );
  };

  const confirmRemove = (thumb: Thumb) => {
    Alert.alert('사진을 뺄까요?', '저장하면 반영돼요.', [
      { text: '취소', style: 'cancel' },
      { text: '빼기', style: 'destructive', onPress: thumb.onRemove },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>사진</Text>
        <Text style={styles.count}>
          {thumbs.length}/{MAX_PHOTOS_PER_MEMO}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {thumbs.map((thumb) => (
          <Pressable
            key={thumb.key}
            testID={`photo-thumb-${thumb.key}`}
            accessibilityRole="button"
            accessibilityLabel="사진, 길게 눌러 빼기"
            onLongPress={() => confirmRemove(thumb)}
            style={styles.thumb}
          >
            {thumb.uri ? <Image source={{ uri: thumb.uri }} style={styles.image} contentFit="cover" /> : <View style={styles.placeholder} />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 빼기"
              hitSlop={8}
              onPress={() => confirmRemove(thumb)}
              style={styles.removeBadge}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </Pressable>
        ))}
        {remaining > 0 && (
          <Pressable
            testID="photo-add"
            accessibilityRole="button"
            accessibilityLabel="사진 추가"
            onPress={pick}
            style={({ pressed }) => [styles.thumb, styles.add, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>＋</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs + 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.inkMuted },
  count: { fontSize: fontSize.caption, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  row: { gap: spacing.sm },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: radius.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, backgroundColor: colors.line },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(27,31,36,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.surface, fontSize: 14, lineHeight: 16, fontWeight: '700' },
  add: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  addText: { fontSize: 26, color: colors.inkMuted },
  pressed: { opacity: 0.8 },
});
