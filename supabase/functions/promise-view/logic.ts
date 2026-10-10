// promise-view 의 순수 로직. Deno API를 쓰지 않아 앱 jest 테스트에서도 불러 검증한다
// (src/features/promise/__tests__/promiseViewLogic.test.ts).

/** 앱(src/features/sharing/shareToken.ts)·import-share 와 같은 토큰 규칙. */
export const PROMISE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,64}$/;

/** 약속이 끝나고 이 기간이 지나면 링크 자체가 열리지 않는다. */
export const LINK_GRACE_DAYS = 30;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidPromiseToken(token: unknown): token is string {
  return typeof token === 'string' && PROMISE_TOKEN_PATTERN.test(token);
}

export function kstToday(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY_MS);
}

export type PromiseRow = {
  title: string;
  address: string | null;
  body: string;
  secret_note: string | null;
  lat: number;
  lng: number;
  promise_start: string | null;
  promise_end: string | null;
};

export type PromiseView = {
  title: string;
  address: string | null;
  body: string;
  lat: number;
  lng: number;
  promiseStart: string;
  promiseEnd: string | null;
  /** 약속 마지막 날까지만 값이 있다. */
  secretNote: string | null;
  /** 비번이 있었지만 약속이 지나 가려졌는지. */
  isSecretHidden: boolean;
};

/**
 * 받는 사람에게 보여줄 내용. 날짜가 지워졌거나 끝나고 LINK_GRACE_DAYS 가 지났으면 null(만료).
 * 비번은 약속 마지막 날(한국 시간)까지만 내보낸다.
 */
export function toPromiseView(row: PromiseRow, now: Date): PromiseView | null {
  if (!row.promise_start) return null;
  const today = kstToday(now);
  const end = row.promise_end ?? row.promise_start;
  const daysSinceEnd = daysBetween(end, today);
  if (daysSinceEnd > LINK_GRACE_DAYS) return null;
  const isSecretVisible = daysSinceEnd <= 0;
  return {
    title: row.title,
    address: row.address,
    body: row.body,
    lat: row.lat,
    lng: row.lng,
    promiseStart: row.promise_start,
    promiseEnd: row.promise_end,
    secretNote: isSecretVisible ? row.secret_note : null,
    isSecretHidden: !isSecretVisible && row.secret_note !== null,
  };
}
