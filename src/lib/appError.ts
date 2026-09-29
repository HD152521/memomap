import { AuthError } from '@supabase/supabase-js';

import { logger } from './logger';

export type AppErrorCode = 'NETWORK' | 'AUTH' | 'VALIDATION' | 'NOT_FOUND' | 'RATE_LIMITED' | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;

  constructor(code: AppErrorCode, userMessage: string, options?: { cause?: unknown }) {
    super(userMessage, options);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

const MESSAGES: Record<AppErrorCode, string> = {
  NETWORK: '네트워크 연결을 확인해 주세요',
  AUTH: '다시 로그인해 주세요',
  VALIDATION: '입력값을 확인해 주세요',
  NOT_FOUND: '삭제되었거나 없는 메모예요',
  RATE_LIMITED: '오늘 사용할 수 있는 횟수를 모두 썼어요. 내일 다시 시도해 주세요',
  UNKNOWN: '문제가 발생했어요. 잠시 후 다시 시도해 주세요',
};

const POSTGREST_NOT_FOUND = 'PGRST116';

function hasCode(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string';
}

function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError && /network request failed|failed to fetch/i.test(e.message);
}

const HTTP_TOO_MANY_REQUESTS = 429;

// supabase.functions.invoke 의 FunctionsHttpError는 context에 fetch Response를 담는다.
function httpStatusOf(e: unknown): number | null {
  const status = (e as { context?: { status?: unknown } } | null)?.context?.status;
  return typeof status === 'number' ? status : null;
}

function classify(e: unknown): AppErrorCode {
  if (e instanceof AuthError) return 'AUTH';
  if (httpStatusOf(e) === HTTP_TOO_MANY_REQUESTS) return 'RATE_LIMITED';
  if (isNetworkError(e)) return 'NETWORK';
  if (hasCode(e) && e.code === POSTGREST_NOT_FOUND) return 'NOT_FOUND';
  return 'UNKNOWN';
}

export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const code = classify(e);
  logger.error('toAppError', { code, name: e instanceof Error ? e.name : typeof e, message: e instanceof Error ? e.message : undefined });
  return new AppError(code, MESSAGES[code], { cause: e });
}

export function validationError(message: string): AppError {
  return new AppError('VALIDATION', message || MESSAGES.VALIDATION);
}
