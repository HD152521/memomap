import { formatPromiseDates, displayTitle } from '@/features/memos/memoChips';
import type { Memo } from '@/features/memos/types';
import { isValidShareToken } from '@/features/sharing/shareToken';
import { AppError, toAppError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';

import type { PromiseView } from '../../../supabase/functions/promise-view/logic';

export type { PromiseView };

const VIEW_FUNCTION = 'promise-view';

/**
 * 받는 사람이 앱 없이 여는 웹 뷰어. 토큰은 # 뒤에 둬서 웹 서버 로그에 남지 않게 한다.
 * 정적 페이지 소스: web/promise/index.html
 */
export const PROMISE_WEB_URL = 'https://hd152521.github.io/memomap/p/';

export function promiseWebUrl(token: string): string {
  return `${PROMISE_WEB_URL}#${token}`;
}

/** 단톡방에 붙여넣을 메시지. 비번은 메시지에 넣지 않는다(링크에서만 약속 날까지 보임). */
export function promiseShareMessage(memo: Pick<Memo, 'title' | 'promiseStart' | 'promiseEnd'>, token: string): string {
  const dates = formatPromiseDates(memo);
  return [`📍 ${displayTitle(memo)}${dates ? ` · ${dates}` : ''}`, '위치랑 필요한 정보는 이 링크에 있어요. 바뀌면 링크에도 바로 반영돼요.', promiseWebUrl(token)].join('\n');
}

function httpStatusOf(e: unknown): number | null {
  const status = (e as { context?: { status?: unknown } } | null)?.context?.status;
  return typeof status === 'number' ? status : null;
}

export const promiseRepository = {
  /** 내 약속 메모의 활성 링크 토큰(없으면 새로 생성). */
  async createShare(memoId: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_promise_share', { p_memo_id: memoId });
    if (error) {
      if (error.message?.includes('PROMISE_DATE_REQUIRED')) throw new AppError('VALIDATION', '약속 날짜를 먼저 정해 주세요', { cause: error });
      throw toAppError(error);
    }
    if (!isValidShareToken(data)) throw new AppError('UNKNOWN', '약속 링크를 만들지 못했어요');
    return data;
  },

  async revokeShare(memoId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_promise_share', { p_memo_id: memoId });
    if (error) throw toAppError(error);
  },

  /** 받은 약속 링크 내용(로그인 불필요). */
  async view(token: string): Promise<PromiseView> {
    if (!isValidShareToken(token)) throw new AppError('NOT_FOUND', '없거나 꺼진 약속 링크예요');
    const { data, error } = await supabase.functions.invoke<PromiseView>(VIEW_FUNCTION, { body: { token } });
    if (!error && data) return data;
    switch (httpStatusOf(error)) {
      case 404:
        throw new AppError('NOT_FOUND', '없거나 꺼진 약속 링크예요', { cause: error });
      case 410:
        throw new AppError('NOT_FOUND', '지난 약속이라 링크가 만료됐어요', { cause: error });
      default:
        throw toAppError(error);
    }
  },
};
