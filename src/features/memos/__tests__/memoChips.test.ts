import { makeMemo } from '@/test/memoFixture';

import { displayTitle, formatPromiseDates, isInSeason, kstParts, promiseLabel, promisePhase, seasonSummary } from '../memoChips';

// 2026-12-01 10:00 KST (화요일) = 2026-12-01T01:00:00Z
const TUE_DEC_1 = new Date('2026-12-01T01:00:00Z');

describe('kstParts', () => {
  test('uses Korean time even when UTC is still the previous day', () => {
    // 2026-11-30T20:00Z = 2026-12-01 05:00 KST (화)
    expect(kstParts(new Date('2026-11-30T20:00:00Z'))).toEqual({ isoDate: '2026-12-01', month: 12, weekday: 2 });
  });
});

describe('displayTitle', () => {
  test('falls back to a placeholder for an empty one-line memo', () => {
    expect(displayTitle(makeMemo({ title: '  ' }))).toBe('이름 없는 메모');
    expect(displayTitle(makeMemo({ title: '2층 화장실' }))).toBe('2층 화장실');
  });
});

describe('isInSeason', () => {
  test('shows memos without a season chip all year', () => {
    expect(isInSeason(makeMemo(), TUE_DEC_1)).toBe(true);
  });

  test('shows a winter Tuesday/Thursday memo on a December Tuesday only', () => {
    const bungeoppang = makeMemo({ visibleMonths: [12, 1, 2], visibleWeekdays: [2, 4] });

    expect(isInSeason(bungeoppang, TUE_DEC_1)).toBe(true);
    expect(isInSeason(bungeoppang, new Date('2026-12-02T01:00:00Z'))).toBe(false); // 수
    expect(isInSeason(bungeoppang, new Date('2026-07-07T01:00:00Z'))).toBe(false); // 7월 화
  });
});

describe('seasonSummary', () => {
  test('names whole seasons and lists leftover months and weekdays', () => {
    expect(seasonSummary(makeMemo({ visibleMonths: [1, 2, 12], visibleWeekdays: [2, 4] }))).toBe('겨울 · 화·목');
    expect(seasonSummary(makeMemo({ visibleMonths: [3, 4, 5, 10] }))).toBe('봄·10월');
    expect(seasonSummary(makeMemo())).toBeNull();
  });
});

describe('promisePhase', () => {
  const trip = makeMemo({ promiseStart: '2026-12-04', promiseEnd: '2026-12-05' });

  test('counts down before the day, then today, ongoing, ended (KST)', () => {
    expect(promisePhase(trip, TUE_DEC_1)).toEqual({ kind: 'upcoming', daysLeft: 3 });
    expect(promisePhase(trip, new Date('2026-12-04T01:00:00Z'))).toEqual({ kind: 'today' });
    expect(promisePhase(trip, new Date('2026-12-05T01:00:00Z'))).toEqual({ kind: 'ongoing' });
    expect(promisePhase(trip, new Date('2026-12-06T01:00:00Z'))).toEqual({ kind: 'ended' });
  });

  test('treats a single-day promise as ended the next day', () => {
    const lunch = makeMemo({ promiseStart: '2026-12-01' });
    expect(promisePhase(lunch, TUE_DEC_1)).toEqual({ kind: 'today' });
    expect(promisePhase(lunch, new Date('2026-12-02T01:00:00Z'))).toEqual({ kind: 'ended' });
    expect(promisePhase(makeMemo(), TUE_DEC_1)).toBeNull();
  });

  test('labels each phase', () => {
    expect(promiseLabel({ kind: 'upcoming', daysLeft: 3 })).toBe('D-3');
    expect(promiseLabel({ kind: 'today' })).toBe('오늘');
    expect(promiseLabel({ kind: 'ended' })).toBe('지난 약속');
  });
});

describe('formatPromiseDates', () => {
  test('formats a single day or a range with weekdays', () => {
    expect(formatPromiseDates(makeMemo({ promiseStart: '2026-11-22' }))).toBe('11/22(일)');
    expect(formatPromiseDates(makeMemo({ promiseStart: '2026-11-21', promiseEnd: '2026-11-22' }))).toBe('11/21(토) – 11/22(일)');
    expect(formatPromiseDates(makeMemo())).toBeNull();
  });
});
