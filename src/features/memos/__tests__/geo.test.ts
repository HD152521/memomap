import { toEwktPoint } from '../geo';

describe('toEwktPoint', () => {
  test('puts longitude first as PostGIS expects', () => {
    expect(toEwktPoint(37.5, 127.0)).toBe('SRID=4326;POINT(127 37.5)');
  });

  test('keeps decimal precision', () => {
    expect(toEwktPoint(37.4979, 127.0276)).toBe('SRID=4326;POINT(127.0276 37.4979)');
  });
});
