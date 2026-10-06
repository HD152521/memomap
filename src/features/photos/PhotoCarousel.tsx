import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';

import type { MemoPhoto } from './types';

const CAROUSEL_HEIGHT = 220;

export function PhotoCarousel({ photos }: { photos: MemoPhoto[] }) {
  const { width } = useWindowDimensions();
  const [fullscreen, setFullscreen] = useState<MemoPhoto | null>(null);
  const visible = photos.filter((photo) => photo.url);
  if (visible.length === 0) return null;

  const itemWidth = width - spacing.lg * 2;

  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: itemWidth }}>
        {visible.map((photo, index) => (
          <Pressable
            key={photo.id}
            testID={`carousel-photo-${photo.id}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={`사진 ${index + 1}/${visible.length}, 탭해서 크게 보기`}
            onPress={() => setFullscreen(photo)}
          >
            <Image source={{ uri: photo.url ?? undefined }} style={[styles.image, { width: itemWidth }]} contentFit="cover" />
            <Text style={styles.counter}>
              {index + 1}/{visible.length}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={fullscreen !== null} transparent animationType="fade" onRequestClose={() => setFullscreen(null)}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" style={styles.backdrop} onPress={() => setFullscreen(null)}>
          {fullscreen?.url && <Image source={{ uri: fullscreen.url }} style={styles.fullImage} contentFit="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { height: CAROUSEL_HEIGHT, borderRadius: radius.md, backgroundColor: colors.line },
  counter: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    color: colors.surface,
    backgroundColor: 'rgba(27,31,36,0.6)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: fontSize.caption,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  fullImage: { width: '100%', height: '80%' },
});
