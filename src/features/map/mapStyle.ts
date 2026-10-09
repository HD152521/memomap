// 네이버 지도 스타일 에디터(style-editor.map.naver.com)에서 만든 메모리맵 커스텀 스타일.
// 라일락 회색 육지·하늘빛 물·세이지 녹지, 상호/번호 아이콘 최소화. 앱에 들어가는 공개 값이다.
// 스타일을 다시 발행해도 ID 는 그대로이고 최신 발행본이 적용된다.
export const MAP_STYLE_IDS = {
  light: 'c9abeeec-5d83-4b58-8536-5c0bb65db124', // memorymap-light
  dark: '962df323-c6ad-4e5b-8eb1-447bbb17e1a2', // memorymap-dark
} as const;

export type ColorSchemeName = 'light' | 'dark' | 'unspecified' | null | undefined;

export function mapStyleIdFor(scheme: ColorSchemeName): string {
  return scheme === 'dark' ? MAP_STYLE_IDS.dark : MAP_STYLE_IDS.light;
}
