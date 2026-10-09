import { NaverMapMarkerOverlay, NaverMapView, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { forwardRef } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { UNGROUPED_COLOR } from '@/features/groups/groupColors';
import type { Memo } from '@/features/memos/types';
import { colors } from '@/ui/theme';

import { mapStyleIdFor } from './mapStyle';

export type Coord = { latitude: number; longitude: number };

// 서울시청
export const DEFAULT_CAMERA = { latitude: 37.5666, longitude: 126.9784, zoom: 14 } as const;

type Props = {
  memos: Memo[];
  /** 그룹 id → 마커 색. 없는 그룹·분류 없음은 기본 회색. */
  groupColors?: ReadonlyMap<string, string>;
  draft: Coord | null;
  onTapMap: (coord: Coord) => void;
  onTapMemo: (id: string) => void;
};

export const MemoMap = forwardRef<NaverMapViewRef, Props>(function MemoMap({ memos, groupColors, draft, onTapMap, onTapMemo }, ref) {
  const scheme = useColorScheme();
  return (
    <NaverMapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      customStyleId={mapStyleIdFor(scheme)}
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
          tintColor={(memo.groupId && groupColors?.get(memo.groupId)) || UNGROUPED_COLOR}
          onTap={() => onTapMemo(memo.id)}
        />
      ))}
      {draft && <NaverMapMarkerOverlay latitude={draft.latitude} longitude={draft.longitude} tintColor={colors.accent} />}
    </NaverMapView>
  );
});
