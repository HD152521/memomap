// 사진 EXIF 에서 촬영 위치·날짜를 꺼낸다. Android(평면 키)와 iOS(중첩 {GPS}/{Exif} 사전) 형태를 모두 받는다.
// 위치가 지워졌거나(0,0) 범위를 벗어난 값은 "없음"으로 본다.

export type PhotoCoord = { lat: number; lng: number };

type ExifRecord = Record<string, unknown>;

function asRecord(value: unknown): ExifRecord | null {
  return typeof value === 'object' && value !== null ? (value as ExifRecord) : null;
}

/** 숫자, 숫자 문자열, "37/1,30/1,0/1"(도/분/초 분수) 문자열을 십진 도(degree)로. */
export function parseCoordinateValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  if (!value.includes('/')) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  const parts = value.split(',').map((part) => {
    const [num, den] = part.split('/').map(Number);
    return den ? num / den : NaN;
  });
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return null;
  const [deg = 0, min = 0, sec = 0] = parts;
  return deg + min / 60 + sec / 3600;
}

function signed(value: number, ref: unknown, negativeRef: 'S' | 'W'): number {
  return typeof ref === 'string' && ref.toUpperCase() === negativeRef ? -Math.abs(value) : value;
}

function isUsable(lat: number, lng: number): boolean {
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  // 위치가 지워진 사본은 0,0 으로 채워지는 경우가 있다.
  return !(lat === 0 && lng === 0);
}

export function extractPhotoLocation(exif: unknown): PhotoCoord | null {
  const root = asRecord(exif);
  if (!root) return null;
  const gps = asRecord(root['{GPS}']); // iOS
  const source = gps ?? root;
  const latKey = gps ? 'Latitude' : 'GPSLatitude';
  const lngKey = gps ? 'Longitude' : 'GPSLongitude';
  const lat = parseCoordinateValue(source[latKey]);
  const lng = parseCoordinateValue(source[lngKey]);
  if (lat === null || lng === null) return null;
  const result = { lat: signed(lat, source[`${latKey}Ref`], 'S'), lng: signed(lng, source[`${lngKey}Ref`], 'W') };
  return isUsable(result.lat, result.lng) ? result : null;
}

const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

/** EXIF DateTimeOriginal("YYYY:MM:DD HH:MM:SS", 기기 현지 시각) → "YYYY-MM-DDTHH:MM:SS"(시간대 없음). */
export function extractTakenAt(exif: unknown): string | null {
  const root = asRecord(exif);
  if (!root) return null;
  const nested = asRecord(root['{Exif}']); // iOS
  const raw = (nested ?? root).DateTimeOriginal ?? root.DateTime;
  if (typeof raw !== 'string') return null;
  const match = EXIF_DATE.exec(raw.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}
