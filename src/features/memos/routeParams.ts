// expo-router params는 모두 string(또는 string[])이다. 좌표로 쓰기 전에 반드시 검증한다.
function toNumber(raw: string | string[] | undefined): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function parseCoordParams(params: { lat?: string | string[]; lng?: string | string[] }): { lat: number; lng: number } | null {
  const lat = toNumber(params.lat);
  const lng = toNumber(params.lng);
  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function firstParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
