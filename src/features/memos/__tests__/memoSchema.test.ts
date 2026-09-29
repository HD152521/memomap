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

  test('rejects a blank title with a Korean message', () => {
    const result = memoInputSchema.safeParse({ ...validInput, title: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('장소 이름을 입력하세요');
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

describe('memoPatchSchema', () => {
  test('accepts a partial update', () => {
    expect(memoPatchSchema.parse({ body: '수정' })).toEqual({ body: '수정' });
  });
});
