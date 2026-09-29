type LogContext = Record<string, unknown>;

const PREFIX = '[memo-map]';

// console.* 는 이 파일에서만 호출한다. 메모 본문·토큰 같은 개인정보는 ctx에 넣지 말 것.
export const logger = {
  error: (message: string, ctx?: LogContext) => {
    if (__DEV__) console.error(`${PREFIX} ${message}`, ctx ?? '');
  },
  warn: (message: string, ctx?: LogContext) => {
    if (__DEV__) console.warn(`${PREFIX} ${message}`, ctx ?? '');
  },
};
