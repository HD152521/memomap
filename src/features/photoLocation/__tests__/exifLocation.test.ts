import { extractPhotoLocation, extractTakenAt, parseCoordinateValue } from '../exifLocation';

describe('parseCoordinateValue', () => {
  test('accepts numbers and numeric strings', () => {
    expect(parseCoordinateValue(37.5)).toBe(37.5);
    expect(parseCoordinateValue('127.25')).toBe(127.25);
  });

  test('converts degree/minute/second fractions', () => {
    expect(parseCoordinateValue('37/1,30/1,0/1')).toBeCloseTo(37.5);
    expect(parseCoordinateValue('126/1,58/1,4200/100')).toBeCloseTo(126 + 58 / 60 + 42 / 3600);
  });

  test('rejects garbage', () => {
    expect(parseCoordinateValue('')).toBeNull();
    expect(parseCoordinateValue('abc')).toBeNull();
    expect(parseCoordinateValue('1/0,2/0')).toBeNull();
    expect(parseCoordinateValue(undefined)).toBeNull();
  });
});

describe('extractPhotoLocation', () => {
  test('reads Android flat GPS keys', () => {
    expect(extractPhotoLocation({ GPSLatitude: 37.5, GPSLatitudeRef: 'N', GPSLongitude: 127, GPSLongitudeRef: 'E' })).toEqual({ lat: 37.5, lng: 127 });
  });

  test('reads iOS nested {GPS} dictionary', () => {
    expect(extractPhotoLocation({ '{GPS}': { Latitude: 37.5, LatitudeRef: 'N', Longitude: 127, LongitudeRef: 'E' } })).toEqual({ lat: 37.5, lng: 127 });
  });

  test('applies south and west references', () => {
    expect(extractPhotoLocation({ GPSLatitude: 33.9, GPSLatitudeRef: 'S', GPSLongitude: 151.2, GPSLongitudeRef: 'W' })).toEqual({ lat: -33.9, lng: -151.2 });
  });

  test('treats missing, redacted (0,0) and out-of-range values as no location', () => {
    expect(extractPhotoLocation({})).toBeNull();
    expect(extractPhotoLocation(null)).toBeNull();
    expect(extractPhotoLocation({ GPSLatitude: 0, GPSLongitude: 0 })).toBeNull();
    expect(extractPhotoLocation({ GPSLatitude: 95, GPSLongitude: 127 })).toBeNull();
  });
});

describe('extractTakenAt', () => {
  test('parses DateTimeOriginal on Android and iOS', () => {
    expect(extractTakenAt({ DateTimeOriginal: '2025:08:15 14:03:22' })).toBe('2025-08-15T14:03:22');
    expect(extractTakenAt({ '{Exif}': { DateTimeOriginal: '2025:08:15 14:03:22' } })).toBe('2025-08-15T14:03:22');
  });

  test('falls back to DateTime', () => {
    expect(extractTakenAt({ DateTime: '2024:01:02 03:04:05' })).toBe('2024-01-02T03:04:05');
  });

  test('rejects malformed dates', () => {
    expect(extractTakenAt({ DateTimeOriginal: '2025-08-15' })).toBeNull();
    expect(extractTakenAt({ DateTimeOriginal: '2025:13:01 00:00:00' })).toBeNull();
    expect(extractTakenAt({})).toBeNull();
  });
});
