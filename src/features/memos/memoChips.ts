import type { Memo } from './types';

// 메모 칩(🗓 시기 · 👥 약속)의 순수 규칙. 날짜는 한국 시간 기준.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const UNTITLED_MEMO = '이름 없는 메모';

export function displayTitle(memo: Pick<Memo, 'title'>): string {
  return memo.title.trim() || UNTITLED_MEMO;
}

/** 한국 시간 기준 날짜 정보. */
export function kstParts(now: Date): { isoDate: string; month: number; weekday: number } {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  return { isoDate: kst.toISOString().slice(0, 10), month: kst.getUTCMonth() + 1, weekday: kst.getUTCDay() };
}

// ---- 🗓 시기 ----

export const SEASONS = [
  { key: 'spring', label: '봄', months: [3, 4, 5] },
  { key: 'summer', label: '여름', months: [6, 7, 8] },
  { key: 'autumn', label: '가을', months: [9, 10, 11] },
  { key: 'winter', label: '겨울', months: [12, 1, 2] },
] as const;

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 오늘 지도에 보여줄 메모인가. 시기 칩이 없으면 항상 보인다. */
export function isInSeason(memo: Pick<Memo, 'visibleMonths' | 'visibleWeekdays'>, now: Date): boolean {
  const { month, weekday } = kstParts(now);
  if (memo.visibleMonths && !memo.visibleMonths.includes(month)) return false;
  if (memo.visibleWeekdays && !memo.visibleWeekdays.includes(weekday)) return false;
  return true;
}

/** 시기 칩 요약: "겨울 · 화·목". 칩이 없으면 null. */
export function seasonSummary(memo: Pick<Memo, 'visibleMonths' | 'visibleWeekdays'>): string | null {
  const parts: string[] = [];
  if (memo.visibleMonths) {
    const months = new Set(memo.visibleMonths);
    const seasons = SEASONS.filter((season) => season.months.every((m) => months.has(m)));
    const covered = new Set<number>(seasons.flatMap((season) => [...season.months]));
    const rest = memo.visibleMonths.filter((m) => !covered.has(m));
    parts.push([...seasons.map((season) => season.label), ...rest.map((m) => `${m}월`)].join('·'));
  }
  if (memo.visibleWeekdays) parts.push(memo.visibleWeekdays.map((d) => WEEKDAY_LABELS[d]).join('·'));
  return parts.length > 0 ? parts.join(' · ') : null;
}

// ---- 👥 약속 ----

export type PromisePhase = { kind: 'upcoming'; daysLeft: number } | { kind: 'today' } | { kind: 'ongoing' } | { kind: 'ended' };

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY_MS);
}

/** 약속 날짜 기준 오늘의 단계. 약속 칩이 없으면 null. */
export function promisePhase(memo: Pick<Memo, 'promiseStart' | 'promiseEnd'>, now: Date): PromisePhase | null {
  if (!memo.promiseStart) return null;
  const today = kstParts(now).isoDate;
  const end = memo.promiseEnd ?? memo.promiseStart;
  const untilStart = daysBetween(today, memo.promiseStart);
  if (untilStart > 0) return { kind: 'upcoming', daysLeft: untilStart };
  if (untilStart === 0) return { kind: 'today' };
  return daysBetween(today, end) >= 0 ? { kind: 'ongoing' } : { kind: 'ended' };
}

export function promiseLabel(phase: PromisePhase): string {
  switch (phase.kind) {
    case 'upcoming':
      return `D-${phase.daysLeft}`;
    case 'today':
      return '오늘';
    case 'ongoing':
      return '진행 중';
    case 'ended':
      return '지난 약속';
  }
}

/** "11/22(토)" 또는 "11/22(토) – 11/23(일)" */
export function formatPromiseDates(memo: Pick<Memo, 'promiseStart' | 'promiseEnd'>): string | null {
  if (!memo.promiseStart) return null;
  const format = (iso: string) => {
    const date = new Date(`${iso}T00:00:00Z`);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${WEEKDAY_LABELS[date.getUTCDay()]})`;
  };
  return memo.promiseEnd && memo.promiseEnd !== memo.promiseStart
    ? `${format(memo.promiseStart)} – ${format(memo.promiseEnd)}`
    : format(memo.promiseStart);
}
