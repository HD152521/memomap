import { pendingShare } from '../pendingShare';

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';

describe('pendingShare', () => {
  test('returns a saved token only once', () => {
    const store = memoryStore();

    pendingShare.set(TOKEN, store);

    expect(pendingShare.take(store)).toBe(TOKEN);
    expect(pendingShare.take(store)).toBeNull();
  });

  test('drops tokens saved more than an hour ago', () => {
    const store = memoryStore();
    const savedAt = 1_000_000;

    pendingShare.set(TOKEN, store, savedAt);

    expect(pendingShare.take(store, savedAt + 61 * 60 * 1000)).toBeNull();
  });

  test('ignores invalid tokens', () => {
    const store = memoryStore();

    pendingShare.set('../bad', store);

    expect(pendingShare.take(store)).toBeNull();
  });

  test('survives a storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('locked');
      },
      setItem: () => {
        throw new Error('locked');
      },
      removeItem: () => undefined,
    };

    expect(() => pendingShare.set(TOKEN, broken)).not.toThrow();
    expect(pendingShare.take(broken)).toBeNull();
  });
});
