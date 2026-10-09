import { MAP_STYLE_IDS, mapStyleIdFor } from '../mapStyle';

describe('mapStyleIdFor', () => {
  test('uses the dark style only in dark mode', () => {
    expect(mapStyleIdFor('dark')).toBe(MAP_STYLE_IDS.dark);
    expect(mapStyleIdFor('light')).toBe(MAP_STYLE_IDS.light);
    expect(mapStyleIdFor(null)).toBe(MAP_STYLE_IDS.light);
  });
});
