import { Camera, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { UNGROUPED_COLOR } from '@/features/groups/groupColors';
import type { Memo } from '@/features/memos/types';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { buildMapStyle } from './mapStyle';

export type Coord = { latitude: number; longitude: number };

// 서울시청
export const DEFAULT_CAMERA = { latitude: 37.5666, longitude: 126.9784, zoom: 14 } as const;
const CAMERA_ANIMATION_MS = 600;

export type MemoMapHandle = {
  moveTo: (coord: Coord, zoom: number) => void;
};

type Props = {
  memos: Memo[];
  /** 그룹 id → 핀 색. 없는 그룹·분류 없음은 기본 회색. */
  groupColors?: ReadonlyMap<string, string>;
  draft: Coord | null;
  onTapMap: (coord: Coord) => void;
  onTapMemo: (id: string) => void;
};

export const MemoMap = forwardRef<MemoMapHandle, Props>(function MemoMap({ memos, groupColors, draft, onTapMap, onTapMemo }, ref) {
  const scheme = useColorScheme();
  const mapStyle = useMemo(() => buildMapStyle(scheme), [scheme]);
  const cameraRef = useRef<CameraRef>(null);

  useImperativeHandle(ref, () => ({
    moveTo: ({ latitude, longitude }, zoom) =>
      cameraRef.current?.easeTo({ center: [longitude, latitude], zoom, duration: CAMERA_ANIMATION_MS }),
  }));

  return (
    <Map
      testID="memo-map"
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle}
      logo={false}
      compass={false}
      attributionPosition={{ bottom: 8, left: 8 }}
      onPress={(event) => {
        const [longitude, latitude] = event.nativeEvent.lngLat;
        onTapMap({ latitude, longitude });
      }}
    >
      <Camera
        ref={cameraRef}
        initialViewState={{ center: [DEFAULT_CAMERA.longitude, DEFAULT_CAMERA.latitude], zoom: DEFAULT_CAMERA.zoom }}
      />
      {memos.map((memo) => (
        <Marker key={memo.id} id={memo.id} lngLat={[memo.lng, memo.lat]} anchor="bottom" onPress={() => onTapMemo(memo.id)}>
          <MemoPin color={(memo.groupId && groupColors?.get(memo.groupId)) || UNGROUPED_COLOR} label={memo.title} />
        </Marker>
      ))}
      {draft && (
        <Marker id="draft" lngLat={[draft.longitude, draft.latitude]} anchor="bottom">
          <MemoPin color={colors.accent} />
        </Marker>
      )}
    </Map>
  );
});

function MemoPin({ color, label }: { color: string; label?: string }) {
  return (
    <View style={styles.pin}>
      <View testID="memo-pin-dot" style={[styles.dot, { backgroundColor: color }]} />
      {label ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const PIN_SIZE = 26;

const styles = StyleSheet.create({
  pin: { alignItems: 'center', gap: 2 },
  dot: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderBottomLeftRadius: 4,
    borderWidth: 3,
    borderColor: colors.surface,
    transform: [{ rotate: '-45deg' }],
    shadowColor: '#26232E',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  label: {
    maxWidth: 120,
    fontSize: fontSize.caption - 1,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radius.sm - 2,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
