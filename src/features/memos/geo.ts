// PostGIS WKT는 경도(lng)가 먼저다. 좌표 → DB 변환은 반드시 이 함수 한 곳에서만 한다.
export function toEwktPoint(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
