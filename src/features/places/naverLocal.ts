// 네이버 지역 검색 API item. mapx/mapy는 WGS84 좌표 × 1e7 정수 문자열이다.
export type NaverLocalItem = {
  title: string;
  link: string;
  category: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
};

export type PlaceCandidate = {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

const COORD_SCALE = 1e7;

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .trim();
}

function toCoord(raw: string, limit: number): number | null {
  if (!raw) return null;
  const value = Number(raw) / COORD_SCALE;
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export function parseNaverLocalItem(item: NaverLocalItem): PlaceCandidate | null {
  const lat = toCoord(item.mapy, 90);
  const lng = toCoord(item.mapx, 180);
  const name = stripHtml(item.title);
  if (lat === null || lng === null || !name) return null;

  const address = item.roadAddress?.trim() || item.address?.trim() || null;
  return { name, address, lat, lng };
}

export function parseNaverLocalItems(items: NaverLocalItem[]): PlaceCandidate[] {
  return items.map(parseNaverLocalItem).filter((place): place is PlaceCandidate => place !== null);
}
