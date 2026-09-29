import { NaverMapMarkerOverlay, NaverMapView, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { forwardRef } from 'react';
import { StyleSheet } from 'react-native';

import type { Memo } from '@/features/memos/types';
import { colors } from '@/ui/theme';

export type Coord = { latitude: number; longitude: number };

// 서울시청
export const DEFAULT_CAMERA = { latitude: 37.5666, longitude: 126.9784, zoom: 14 } as const;

type Props = {
  memos: Memo[];
  draft: Coord | null;
  onTapMap: (coord: Coord) => void;
  onTapMemo: (id: string) => void;
};

export const MemoMap = forwardRef<NaverMapViewRef, Props>(function MemoMap({ memos, draft, onTapMap, onTapMemo }, ref) {
  return (
    <NaverMapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialCamera={DEFAULT_CAMERA}
      isShowLocationButton={false}
      onTapMap={({ latitude, longitude }) => onTapMap({ latitude, longitude })}
    >
      {memos.map((memo) => (
        <NaverMapMarkerOverlay
          key={memo.id}
          latitude={memo.lat}
          longitude={memo.lng}
          caption={{ text: memo.title }}
          onTap={() => onTapMemo(memo.id)}
        />
      ))}
      {draft && <NaverMapMarkerOverlay latitude={draft.latitude} longitude={draft.longitude} tintColor={colors.accent} />}
    </NaverMapView>
  );
});
