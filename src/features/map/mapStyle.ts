// 스타일 스펙 타입은 maplibre-react-native 가 의존하는 버전을 그대로 쓴다(타입 전용 import).
import type { ExpressionSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

// 메모리맵 지도 스타일. OpenFreeMap(OpenStreetMap 데이터, 키 불필요) 벡터 타일 위에
// 프로토타입 색(라일락 회색 육지·하늘빛 물·세이지 녹지·흰 길)을 직접 입힌다.
// 상호·아이콘(POI)은 그리지 않는다: 지도 위 정보는 내 메모만.
export const OPENFREEMAP_TILES_URL = 'https://tiles.openfreemap.org/planet';
const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const LABEL_FONT = ['Noto Sans Regular'];
const OSM_ATTRIBUTION = '© OpenStreetMap contributors · OpenFreeMap';

export type ColorSchemeName = 'light' | 'dark' | 'unspecified' | null | undefined;

type MapPalette = {
  land: string;
  zone: string;
  water: string;
  green: string;
  wood: string;
  building: string;
  road: string;
  roadMajor: string;
  roadCasing: string;
  path: string;
  rail: string;
  label: string;
  labelHalo: string;
  waterLabel: string;
};

export const MAP_PALETTES: Record<'light' | 'dark', MapPalette> = {
  light: {
    land: '#ECEAF1',
    zone: '#E6E3EC',
    water: '#CDDCEA',
    green: '#DCE8DB',
    wood: '#D6E4D5',
    building: '#E2DEEA',
    road: '#FFFFFF',
    roadMajor: '#FFFFFF',
    roadCasing: '#DDD8E6',
    path: '#F6F4F9',
    rail: '#D9D4E2',
    label: '#8A8597',
    labelHalo: '#ECEAF1',
    waterLabel: '#8AA3BF',
  },
  dark: {
    land: '#24212D',
    zone: '#29262F',
    water: '#2A3747',
    green: '#25312A',
    wood: '#24302A',
    building: '#2B2836',
    road: '#3A3646',
    roadMajor: '#4A4558',
    roadCasing: '#1F1C27',
    path: '#322E3D',
    rail: '#3A3646',
    label: '#A39FB0',
    labelHalo: '#24212D',
    waterLabel: '#6F87A6',
  },
};

const MAJOR_ROADS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:ko'], ['get', 'name']];

const roadWidth = (base: number): ExpressionSpecification => [
  'interpolate',
  ['exponential', 1.6],
  ['zoom'],
  12,
  base * 0.5,
  15,
  base * 2,
  18,
  base * 8,
];

const classIn = (classes: string[]): ExpressionSpecification => ['in', ['get', 'class'], ['literal', classes]];

export function buildMapStyle(scheme: ColorSchemeName): StyleSpecification {
  const c = scheme === 'dark' ? MAP_PALETTES.dark : MAP_PALETTES.light;
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: { omt: { type: 'vector', url: OPENFREEMAP_TILES_URL, attribution: OSM_ATTRIBUTION } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': c.land } },
      { id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse', paint: { 'fill-color': c.zone, 'fill-opacity': 0.6 } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.green } },
      {
        id: 'landcover',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['grass', 'wood', 'farmland']),
        paint: { 'fill-color': ['match', ['get', 'class'], 'wood', c.wood, c.green] },
      },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': c.water, 'line-width': 2 } },
      {
        id: 'building',
        type: 'fill',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 14,
        paint: { 'fill-color': c.building, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, 0.7] },
      },
      {
        id: 'road-casing',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: classIn(MAJOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.roadCasing, 'line-width': roadWidth(2.4) },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: classIn(['minor', 'service']),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.road, 'line-opacity': 0.75, 'line-width': roadWidth(0.7) },
      },
      {
        id: 'path',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 15,
        filter: classIn(['path', 'track']),
        paint: { 'line-color': c.path, 'line-width': 1.2, 'line-dasharray': [2, 2] },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: classIn(MAJOR_ROADS),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.roadMajor, 'line-width': roadWidth(1.8) },
      },
      {
        id: 'rail',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['==', ['get', 'class'], 'rail'],
        paint: { 'line-color': c.rail, 'line-width': 1.4, 'line-dasharray': [3, 2] },
      },
      {
        id: 'water-name',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'water_name',
        layout: { 'text-field': NAME, 'text-font': LABEL_FONT, 'text-size': 13, 'text-letter-spacing': 0.2 },
        paint: { 'text-color': c.waterLabel, 'text-halo-color': c.water, 'text-halo-width': 1 },
      },
      {
        id: 'road-name',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 15,
        filter: classIn(['primary', 'secondary', 'tertiary']),
        layout: { 'symbol-placement': 'line', 'text-field': NAME, 'text-font': LABEL_FONT, 'text-size': 10 },
        paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.5 },
      },
      {
        id: 'place',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        filter: classIn(['suburb', 'quarter', 'neighbourhood']),
        layout: {
          'text-field': NAME,
          'text-font': LABEL_FONT,
          'text-size': ['match', ['get', 'class'], 'suburb', 15, 13],
          'text-letter-spacing': 0.1,
        },
        paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 2 },
      },
    ],
  };
}
