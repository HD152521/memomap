// Edge Function(import-share)의 순수 로직 — Deno 없이 검증한다. 행 복사 규칙은 supabase/tests/rls_check.sql 에서 검증.
import { chunk, copiedPhotoPath, isValidShareToken, rpcErrorToResponse } from '../../../../supabase/functions/import-share/logic';
import { isValidShareToken as isValidAppToken } from '../shareToken';

describe('share token rules', () => {
  test('server and app accept and reject the same tokens', () => {
    for (const token of ['abcdefghijklmnopqrstuvwxyz012345', 'A-b_C'.repeat(5), 'short', '../../etc/passwd', 'a'.repeat(65)]) {
      expect(isValidShareToken(token)).toBe(isValidAppToken(token));
    }
  });
});

describe('rpcErrorToResponse', () => {
  test('maps SQL error codes to HTTP statuses', () => {
    expect(rpcErrorToResponse('SHARE_NOT_FOUND')).toEqual({ status: 404, error: 'SHARE_NOT_FOUND' });
    expect(rpcErrorToResponse('OWN_SHARE')).toEqual({ status: 409, error: 'OWN_SHARE' });
    expect(rpcErrorToResponse('SHARE_TOO_LARGE')).toEqual({ status: 413, error: 'SHARE_TOO_LARGE' });
    expect(rpcErrorToResponse('RATE_LIMITED')).toEqual({ status: 429, error: 'RATE_LIMITED' });
    expect(rpcErrorToResponse('NOTHING_TO_UNDO')).toEqual({ status: 404, error: 'NOTHING_TO_UNDO' });
  });

  test('hides unknown errors behind a generic 500', () => {
    expect(rpcErrorToResponse('duplicate key value violates unique constraint')).toEqual({ status: 500, error: 'IMPORT_FAILED' });
    expect(rpcErrorToResponse(undefined)).toEqual({ status: 500, error: 'IMPORT_FAILED' });
  });
});

describe('helpers', () => {
  test('chunk splits into fixed-size batches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });

  test('copiedPhotoPath starts with the receiver id', () => {
    expect(copiedPhotoPath('receiver', 'm2', 'f')).toBe('receiver/m2/f.jpg');
  });
});
