import { logger } from '@/lib/logger';

import { isValidShareToken } from './shareToken';

// 로그인 전에 공유 링크를 열면 토큰을 잠시 보관했다가 로그인 직후 이어서 가져온다.
// 며칠 지난 링크가 다음 로그인 때 맥락 없이 가져와지지 않도록 유효 시간을 둔다.
const KEY = 'memomap.pendingShare';
export const PENDING_SHARE_TTL_MS = 60 * 60 * 1000;

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Stored = { token: string; savedAt: number };

function store(): KeyValueStore | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function parse(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Stored>;
    return isValidShareToken(value.token) && typeof value.savedAt === 'number' ? { token: value.token, savedAt: value.savedAt } : null;
  } catch {
    return null;
  }
}

export const pendingShare = {
  set(token: string, storage: KeyValueStore | null = store(), now: number = Date.now()): void {
    if (!isValidShareToken(token) || !storage) return;
    try {
      storage.setItem(KEY, JSON.stringify({ token, savedAt: now } satisfies Stored));
    } catch (e) {
      logger.warn('pending share not saved', { message: e instanceof Error ? e.message : String(e) });
    }
  },

  /** 보관된 토큰을 꺼내고 지운다(한 번만, 유효 시간 안에서만 반환). */
  take(storage: KeyValueStore | null = store(), now: number = Date.now()): string | null {
    if (!storage) return null;
    try {
      const stored = parse(storage.getItem(KEY));
      storage.removeItem(KEY);
      if (!stored || now - stored.savedAt > PENDING_SHARE_TTL_MS) return null;
      return stored.token;
    } catch (e) {
      logger.warn('pending share not read', { message: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },
};
