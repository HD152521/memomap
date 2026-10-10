import type { Memo } from '@/features/memos/types';

/** 테스트용 메모. 칩(비번·시기·약속)은 기본으로 비어 있다. */
export function makeMemo(overrides: Partial<Memo> = {}): Memo {
  return {
    id: 'm1',
    title: '카페',
    address: null,
    naverPlaceId: null,
    groupId: null,
    lat: 37.5,
    lng: 127,
    body: '',
    secretNote: null,
    visibleMonths: null,
    visibleWeekdays: null,
    promiseStart: null,
    promiseEnd: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}
