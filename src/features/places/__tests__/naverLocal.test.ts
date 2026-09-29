import { parseNaverLocalItem, parseNaverLocalItems, type NaverLocalItem } from '../naverLocal';

const baseItem: NaverLocalItem = {
  title: '<b>스타벅스</b> 강남점',
  link: '',
  category: '카페,디저트>카페',
  address: '서울특별시 강남구 역삼동 825',
  roadAddress: '서울특별시 강남구 강남대로 390',
  mapx: '1270276000',
  mapy: '374979000',
};

describe('parseNaverLocalItem', () => {
  test('converts mapx/mapy (WGS84 × 1e7) to lat/lng and strips <b> tags', () => {
    // Arrange / Act
    const place = parseNaverLocalItem(baseItem);

    // Assert
    expect(place).toEqual({
      name: '스타벅스 강남점',
      address: '서울특별시 강남구 강남대로 390',
      lat: 37.4979,
      lng: 127.0276,
    });
  });

  test('decodes HTML entities in the title', () => {
    expect(parseNaverLocalItem({ ...baseItem, title: '<b>스타</b>벅스 &amp; 카페' })?.name).toBe('스타벅스 & 카페');
  });

  test('falls back to the lot address when roadAddress is empty', () => {
    expect(parseNaverLocalItem({ ...baseItem, roadAddress: '' })?.address).toBe('서울특별시 강남구 역삼동 825');
  });

  test('returns null address when both addresses are empty', () => {
    expect(parseNaverLocalItem({ ...baseItem, roadAddress: '', address: '' })?.address).toBeNull();
  });

  test('returns null for missing or out-of-range coordinates', () => {
    expect(parseNaverLocalItem({ ...baseItem, mapx: '' })).toBeNull();
    expect(parseNaverLocalItem({ ...baseItem, mapy: 'abc' })).toBeNull();
    expect(parseNaverLocalItem({ ...baseItem, mapy: '9999999999' })).toBeNull();
  });
});

describe('parseNaverLocalItems', () => {
  test('drops invalid items', () => {
    const places = parseNaverLocalItems([baseItem, { ...baseItem, mapx: '' }]);

    expect(places).toHaveLength(1);
  });
});
