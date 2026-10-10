import type { Memo } from './types';

const EARTH_RADIUS_M = 6_371_000;
/** "지금 여기 근처" 반경. 걸어서 몇 분 안쪽. */
export const NEARBY_RADIUS_M = 300;
export const NEARBY_MAX_COUNT = 5;

type LatLng = { latitude: number; longitude: number };

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 두 좌표 사이 거리(m, haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export type NearbyMemo = { memo: Memo; distance: number };

/** 반경 안의 메모를 가까운 순으로. 지도는 메모 전체를 이미 갖고 있어 서버 조회 없이 계산한다. */
export function nearbyMemos(memos: Memo[], here: LatLng, radius = NEARBY_RADIUS_M, limit = NEARBY_MAX_COUNT): NearbyMemo[] {
  return memos
    .map((memo) => ({ memo, distance: distanceMeters(here, { latitude: memo.lat, longitude: memo.lng }) }))
    .filter((item) => item.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)}m` : `${(meters / 1000).toFixed(1)}km`;
}
