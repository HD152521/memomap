import { z } from 'zod';

export const MEMO_TITLE_MAX_LENGTH = 100;
export const MEMO_ADDRESS_MAX_LENGTH = 200;
export const MEMO_BODY_MAX_LENGTH = 5000;
export const MEMO_SECRET_MAX_LENGTH = 500;
export const PROMISE_MAX_DAYS = 30;
const NAVER_PLACE_ID_MAX_LENGTH = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않아요');

/** 중복 없이 정렬한 정수 목록. 빈 목록은 "항상"(null)으로 본다. */
const dayList = (min: number, max: number) =>
  z
    .array(z.number().int().min(min).max(max))
    .max(max - min + 1)
    .nullable()
    .transform((values) => (values && values.length > 0 ? [...new Set(values)].sort((a, b) => a - b) : null));

const emptyToNull = (value: string | null) => (value ? value : null);

// DB CHECK 제약(20261001000000_init_memos.sql, 20261010000000_memo_chips.sql)과 같은 한도를 유지할 것.
const memoFields = z.object({
  // 한 줄 메모. 비워도 된다(핀만 찍고 나중에 쓰기) → 화면에는 "이름 없는 메모".
  title: z.string().trim().max(MEMO_TITLE_MAX_LENGTH, `한 줄 메모는 ${MEMO_TITLE_MAX_LENGTH}자 이하로 입력하세요`),
  address: z.string().trim().max(MEMO_ADDRESS_MAX_LENGTH, `주소는 ${MEMO_ADDRESS_MAX_LENGTH}자 이하로 입력하세요`).nullable().transform(emptyToNull),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  body: z.string().max(MEMO_BODY_MAX_LENGTH, `메모는 ${MEMO_BODY_MAX_LENGTH}자 이하로 입력하세요`),
  naverPlaceId: z.string().max(NAVER_PLACE_ID_MAX_LENGTH).nullable(),
  // 미지정 = 분류 없음. 그룹 소유자 확인은 DB 트리거(memos_group_owner_check)가 한다.
  groupId: z.uuid('그룹을 다시 골라 주세요').nullable().optional(),
  // 🔒 비번(숨김 메모)
  secretNote: z.string().trim().max(MEMO_SECRET_MAX_LENGTH, `비번은 ${MEMO_SECRET_MAX_LENGTH}자 이하로 입력하세요`).nullable().optional().transform((v) => (v === undefined ? undefined : emptyToNull(v))),
  // 🗓 시기: 보이는 달(1~12)·요일(0=일~6=토). null = 항상.
  visibleMonths: dayList(1, 12).optional(),
  visibleWeekdays: dayList(0, 6).optional(),
  // 👥 약속 날짜(YYYY-MM-DD). 하루면 promiseEnd 는 null.
  promiseStart: isoDate.nullable().optional(),
  promiseEnd: isoDate.nullable().optional(),
});

type PromiseFields = { promiseStart?: string | null; promiseEnd?: string | null };

function checkPromiseRange(values: PromiseFields, ctx: z.RefinementCtx) {
  const { promiseStart, promiseEnd } = values;
  if (!promiseEnd) return;
  if (!promiseStart) {
    ctx.addIssue({ code: 'custom', path: ['promiseStart'], message: '시작 날짜를 먼저 고르세요' });
    return;
  }
  const days = (Date.parse(promiseEnd) - Date.parse(promiseStart)) / DAY_MS;
  if (days < 0) ctx.addIssue({ code: 'custom', path: ['promiseEnd'], message: '끝 날짜가 시작 날짜보다 빨라요' });
  else if (days > PROMISE_MAX_DAYS) ctx.addIssue({ code: 'custom', path: ['promiseEnd'], message: `약속 기간은 최대 ${PROMISE_MAX_DAYS}일이에요` });
}

export const memoInputSchema = memoFields.superRefine(checkPromiseRange);

// 부분 수정에서는 두 날짜를 함께 보낼 때만 기간을 검사한다(한쪽만 오면 DB CHECK 가 최종 확인).
export const memoPatchSchema = memoFields.partial().superRefine((values, ctx) => {
  if (values.promiseStart !== undefined && values.promiseEnd !== undefined) checkPromiseRange(values, ctx);
});

export type MemoInput = z.input<typeof memoInputSchema>;
export type MemoPatch = z.input<typeof memoPatchSchema>;
