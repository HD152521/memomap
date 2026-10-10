import { buildMapStyle, MAP_PALETTES, OPENFREEMAP_TILES_URL } from '../mapStyle';

const paintOf = (scheme: 'light' | 'dark' | null, layerId: string) => {
  const layer = buildMapStyle(scheme).layers.find((l) => l.id === layerId);
  return (layer as { paint?: Record<string, unknown> } | undefined)?.paint;
};

describe('buildMapStyle', () => {
  test('uses the OpenFreeMap vector source with OSM attribution', () => {
    const style = buildMapStyle('light');

    expect(style.sources.omt).toMatchObject({ type: 'vector', url: OPENFREEMAP_TILES_URL });
    expect(JSON.stringify(style.sources.omt)).toContain('OpenStreetMap');
  });

  test('paints land and water with the prototype palette per color scheme', () => {
    expect(paintOf('light', 'bg')?.['background-color']).toBe(MAP_PALETTES.light.land);
    expect(paintOf('light', 'water')?.['fill-color']).toBe('#CDDCEA');
    expect(paintOf('dark', 'bg')?.['background-color']).toBe(MAP_PALETTES.dark.land);
    expect(paintOf(null, 'bg')?.['background-color']).toBe(MAP_PALETTES.light.land);
  });

  test('draws no POI layer so only my memos stand out', () => {
    const sourceLayers = buildMapStyle('light').layers.map((l) => (l as { 'source-layer'?: string })['source-layer']);

    expect(sourceLayers).not.toContain('poi');
  });
});
