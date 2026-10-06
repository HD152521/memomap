import { groupInputSchema } from '../groupSchema';

const valid = { name: ' 맛집 ', emoji: '🍜', color: '#E8553E' };

describe('groupInputSchema', () => {
  test('accepts a palette color and trims the name', () => {
    expect(groupInputSchema.parse(valid).name).toBe('맛집');
  });

  test('rejects a blank name with a Korean message', () => {
    const result = groupInputSchema.safeParse({ ...valid, name: '  ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('그룹 이름을 입력하세요');
  });

  test('rejects names over 30 characters', () => {
    expect(groupInputSchema.safeParse({ ...valid, name: '가'.repeat(31) }).success).toBe(false);
  });

  test('rejects colors outside the palette', () => {
    expect(groupInputSchema.safeParse({ ...valid, color: '#000000' }).success).toBe(false);
  });

  test('rejects an empty emoji', () => {
    expect(groupInputSchema.safeParse({ ...valid, emoji: '' }).success).toBe(false);
  });
});
