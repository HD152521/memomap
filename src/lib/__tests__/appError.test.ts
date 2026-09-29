import { AuthError } from '@supabase/supabase-js';

import { AppError, toAppError, validationError } from '../appError';

jest.mock('../logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

describe('toAppError', () => {
  test('maps supabase AuthError to AUTH', () => {
    // Arrange
    const error = new AuthError('jwt expired', 401);

    // Act
    const result = toAppError(error);

    // Assert
    expect(result.code).toBe('AUTH');
    expect(result.userMessage).toBe('다시 로그인해 주세요');
    expect(result.cause).toBe(error);
  });

  test('maps fetch network failure to NETWORK', () => {
    const result = toAppError(new TypeError('Network request failed'));

    expect(result.code).toBe('NETWORK');
    expect(result.userMessage).toBe('네트워크 연결을 확인해 주세요');
  });

  test('maps PostgREST no-rows error to NOT_FOUND', () => {
    const result = toAppError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });

    expect(result.code).toBe('NOT_FOUND');
  });

  test('maps an edge function 429 response to RATE_LIMITED', () => {
    const result = toAppError({ name: 'FunctionsHttpError', context: { status: 429 } });

    expect(result.code).toBe('RATE_LIMITED');
  });

  test('maps anything else to UNKNOWN', () => {
    expect(toAppError(new Error('boom')).code).toBe('UNKNOWN');
    expect(toAppError('string error').code).toBe('UNKNOWN');
    expect(toAppError({ code: '23505' }).code).toBe('UNKNOWN');
  });

  test('returns an existing AppError unchanged', () => {
    const original = new AppError('VALIDATION', '장소 이름을 입력하세요');

    expect(toAppError(original)).toBe(original);
  });
});

describe('validationError', () => {
  test('uses the given message', () => {
    const result = validationError('장소 이름을 입력하세요');

    expect(result.code).toBe('VALIDATION');
    expect(result.userMessage).toBe('장소 이름을 입력하세요');
  });

  test('falls back to the default message when empty', () => {
    expect(validationError('').userMessage).toBe('입력값을 확인해 주세요');
  });
});
