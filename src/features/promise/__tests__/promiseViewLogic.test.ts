// Edge Function(promise-view)의 순수 로직 — Deno 없이 검증한다.
import { isValidPromiseToken, kstToday, LINK_GRACE_DAYS, toPromiseView, type PromiseRow } from '../../../../supabase/functions/promise-view/logic';
import { isValidShareToken } from '../../sharing/shareToken';

const row: PromiseRow = {
  title: '강릉 숙소',
  address: '강원 강릉시',
  body: '체크인 3시 · 주차 건물 뒤',
  secret_note: '현관 4321',
  lat: 37.75,
  lng: 128.9,
  promise_start: '2026-11-21',
  promise_end: '2026-11-22',
};

// 한국 시간 정오
const kstNoon = (isoDate: string) => new Date(`${isoDate}T03:00:00Z`);

describe('isValidPromiseToken', () => {
  test('uses the same token rule as the app', () => {
    for (const token of ['abcdefghijklmnopqrstuvwxyz012345', 'short', '../../etc/passwd', 'a'.repeat(65)]) {
      expect(isValidPromiseToken(token)).toBe(isValidShareToken(token));
    }
  });
});

describe('kstToday', () => {
  test('rolls over at midnight Korean time', () => {
    expect(kstToday(new Date('2026-11-21T14:59:00Z'))).toBe('2026-11-21');
    expect(kstToday(new Date('2026-11-21T15:00:00Z'))).toBe('2026-11-22');
  });
});

describe('toPromiseView', () => {
  test('shows the secret before and through the last day', () => {
    expect(toPromiseView(row, kstNoon('2026-11-18'))?.secretNote).toBe('현관 4321');
    expect(toPromiseView(row, kstNoon('2026-11-22'))?.secretNote).toBe('현관 4321');
  });

  test('hides the secret the day after the promise ends', () => {
    const view = toPromiseView(row, kstNoon('2026-11-23'));

    expect(view?.secretNote).toBeNull();
    expect(view?.isSecretHidden).toBe(true);
    expect(view?.title).toBe('강릉 숙소');
  });

  test('uses the start date as the end for a single-day promise', () => {
    const lunch = { ...row, promise_end: null };
    expect(toPromiseView(lunch, kstNoon('2026-11-21'))?.secretNote).toBe('현관 4321');
    expect(toPromiseView(lunch, kstNoon('2026-11-22'))?.secretNote).toBeNull();
  });

  test(`expires the link ${LINK_GRACE_DAYS} days after the end, or when the date was removed`, () => {
    expect(toPromiseView(row, kstNoon('2026-12-22'))).not.toBeNull(); // 30일째
    expect(toPromiseView(row, kstNoon('2026-12-23'))).toBeNull(); // 31일째
    expect(toPromiseView({ ...row, promise_start: null, promise_end: null }, kstNoon('2026-11-20'))).toBeNull();
  });

  test('does not report a hidden secret when there never was one', () => {
    expect(toPromiseView({ ...row, secret_note: null }, kstNoon('2026-11-25'))?.isSecretHidden).toBe(false);
  });

  test('never exposes fields beyond what the recipient needs', () => {
    expect(Object.keys(toPromiseView(row, kstNoon('2026-11-20')) ?? {}).sort()).toEqual(
      ['address', 'body', 'isSecretHidden', 'lat', 'lng', 'promiseEnd', 'promiseStart', 'secretNote', 'title'].sort(),
    );
  });
});
