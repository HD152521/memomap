import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/lib/logger';

import type { Coord } from './MemoMap';

/** 근처 메모를 다시 계산할 만큼 움직였을 때만 갱신(배터리·렌더 절약). */
const WATCH_DISTANCE_M = 30;

type HereLocation = {
  here: Coord | null;
  /** 권한을 묻고(필요하면) 현재 위치를 돌려준다. 거부되면 null. */
  locate: () => Promise<Coord | null>;
};

/**
 * 지금 내 위치. 이미 권한이 있으면 앱을 열자마자 따라가고, 없으면 locate() 를 부를 때 묻는다.
 * (첫 화면에서 바로 권한을 요구하지 않는다.)
 */
export function useHereLocation(): HereLocation {
  const [here, setHere] = useState<Coord | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const startWatching = useCallback(async () => {
    if (subscriptionRef.current) return;
    try {
      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: WATCH_DISTANCE_M },
        ({ coords }) => setHere({ latitude: coords.latitude, longitude: coords.longitude }),
      );
    } catch (e) {
      logger.warn('location watch failed', { message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (isActive && status === 'granted') startWatching();
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [startWatching]);

  const locate = useCallback(async (): Promise<Coord | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coord = { latitude: coords.latitude, longitude: coords.longitude };
    setHere(coord);
    startWatching();
    return coord;
  }, [startWatching]);

  return { here, locate };
}
