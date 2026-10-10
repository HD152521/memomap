import { makeMemo } from '@/test/memoFixture';

import { distanceMeters, formatDistance, nearbyMemos } from '../nearby';

const here = { latitude: 37.5446, longitude: 127.0557 };

describe('distanceMeters', () => {
  test('is about 111m per 0.001 degree of latitude', () => {
    expect(distanceMeters(here, { latitude: 37.5456, longitude: 127.0557 })).toBeCloseTo(111, 0);
  });
});

describe('nearbyMemos', () => {
  test('returns memos within the radius, closest first, capped', () => {
    const memos = [
      makeMemo({ id: 'far', lat: 37.56, lng: 127.0557 }), // ~1.7km
      makeMemo({ id: 'mid', lat: 37.5465, lng: 127.0557 }), // ~210m
      makeMemo({ id: 'near', lat: 37.5448, lng: 127.0557 }), // ~22m
    ];

    const result = nearbyMemos(memos, here, 300, 5);

    expect(result.map((item) => item.memo.id)).toEqual(['near', 'mid']);
    expect(nearbyMemos(memos, here, 300, 1).map((item) => item.memo.id)).toEqual(['near']);
  });
});

describe('formatDistance', () => {
  test('rounds meters to tens and switches to km', () => {
    expect(formatDistance(4)).toBe('10m');
    expect(formatDistance(212)).toBe('210m');
    expect(formatDistance(1730)).toBe('1.7km');
  });
});
