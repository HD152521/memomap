import { MEMO_BODY_MAX_LENGTH, memoInputSchema, memoPatchSchema } from '../memoSchema';

const validInput = {
  title: '  스타벅스 강남점 ',
  address: '서울 강남구 강남대로 390',
  lat: 37.4979,
  lng: 127.0276,
  body: '화장실 비번 1234*',
  naverPlaceId: null,
};

describe('memoInputSchema', () => {
  test('accepts valid input and trims the title', () => {
    const result = memoInputSchema.parse(validInput);

    expect(result.title).toBe('스타벅스 강남점');
  });

  test('allows an empty one-line memo (pin now, write later)', () => {
    expect(memoInputSchema.parse({ ...validInput, title: '   ' }).title).toBe('');
  });

  test('rejects a one-line memo over 100 chars with a Korean message', () => {
    const result = memoInputSchema.safeParse({ ...validInput, title: '가'.repeat(101) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('한 줄 메모는 100자 이하로 입력하세요');
  });

  test('rejects a body over the max length', () => {
    const result = memoInputSchema.safeParse({ ...validInput, body: 'a'.repeat(MEMO_BODY_MAX_LENGTH + 1) });

    expect(result.success).toBe(false);
  });

  test('accepts a body exactly at the max length', () => {
    expect(memoInputSchema.safeParse({ ...validInput, body: 'a'.repeat(MEMO_BODY_MAX_LENGTH) }).success).toBe(true);
  });

  test('rejects out-of-range coordinates', () => {
    expect(memoInputSchema.safeParse({ ...validInput, lat: 91 }).success).toBe(false);
    expect(memoInputSchema.safeParse({ ...validInput, lng: -181 }).success).toBe(false);
  });

  test('normalizes an empty address to null', () => {
    expect(memoInputSchema.parse({ ...validInput, address: '  ' }).address).toBeNull();
  });
});

describe('memo chips', () => {
  test('normalizes an empty secret to null and keeps a real one trimmed', () => {
    expect(memoInputSchema.parse({ ...validInput, secretNote: '  ' }).secretNote).toBeNull();
    expect(memoInputSchema.parse({ ...validInput, secretNote: ' 1234* ' }).secretNote).toBe('1234*');
  });

  test('dedupes and sorts season months/weekdays; empty means always', () => {
    const parsed = memoInputSchema.parse({ ...validInput, visibleMonths: [12, 1, 2, 1], visibleWeekdays: [] });

    expect(parsed.visibleMonths).toEqual([1, 2, 12]);
    expect(parsed.visibleWeekdays).toBeNull();
  });

  test('rejects month 13 and weekday 7', () => {
    expect(memoInputSchema.safeParse({ ...validInput, visibleMonths: [13] }).success).toBe(false);
    expect(memoInputSchema.safeParse({ ...validInput, visibleWeekdays: [7] }).success).toBe(false);
  });

  test('validates the promise date range', () => {
    const ok = memoInputSchema.safeParse({ ...validInput, promiseStart: '2026-11-21', promiseEnd: '2026-11-22' });
    const backwards = memoInputSchema.safeParse({ ...validInput, promiseStart: '2026-11-22', promiseEnd: '2026-11-21' });
    const tooLong = memoInputSchema.safeParse({ ...validInput, promiseStart: '2026-11-01', promiseEnd: '2026-12-15' });
    const endOnly = memoInputSchema.safeParse({ ...validInput, promiseEnd: '2026-11-22' });

    expect(ok.success).toBe(true);
    expect(backwards.error?.issues[0]?.message).toBe('끝 날짜가 시작 날짜보다 빨라요');
    expect(tooLong.error?.issues[0]?.message).toBe('약속 기간은 최대 30일이에요');
    expect(endOnly.error?.issues[0]?.message).toBe('시작 날짜를 먼저 고르세요');
  });
});

describe('memoPatchSchema', () => {
  test('accepts a partial update', () => {
    expect(memoPatchSchema.parse({ body: '수정' })).toEqual({ body: '수정' });
  });
});
