import { firstParam, isUuid, parseCoordParams } from '../routeParams';

describe('parseCoordParams', () => {
  test('parses numeric string params', () => {
    expect(parseCoordParams({ lat: '37.5', lng: '127.01' })).toEqual({ lat: 37.5, lng: 127.01 });
  });

  test('returns null for missing, blank, or non-numeric params', () => {
    expect(parseCoordParams({})).toBeNull();
    expect(parseCoordParams({ lat: '', lng: '127' })).toBeNull();
    expect(parseCoordParams({ lat: 'abc', lng: '127' })).toBeNull();
    expect(parseCoordParams({ lat: ['37', '38'], lng: '127' })).toBeNull();
  });

  test('returns null for out-of-range coordinates', () => {
    expect(parseCoordParams({ lat: '91', lng: '127' })).toBeNull();
    expect(parseCoordParams({ lat: '37', lng: '181' })).toBeNull();
  });
});

describe('firstParam', () => {
  test('returns the first item of an array param', () => {
    expect(firstParam(['a', 'b'])).toBe('a');
    expect(firstParam('a')).toBe('a');
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe('isUuid', () => {
  test('accepts a v4 uuid and rejects garbage', () => {
    expect(isUuid('3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b')).toBe(true);
    expect(isUuid('garbage')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
