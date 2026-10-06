import { z } from 'zod';

export const MEMO_TITLE_MAX_LENGTH = 100;
export const MEMO_ADDRESS_MAX_LENGTH = 200;
export const MEMO_BODY_MAX_LENGTH = 5000;
const NAVER_PLACE_ID_MAX_LENGTH = 50;

// DB CHECK 제약(20261001000000_init_memos.sql)과 같은 한도를 유지할 것.
export const memoInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '장소 이름을 입력하세요')
    .max(MEMO_TITLE_MAX_LENGTH, `장소 이름은 ${MEMO_TITLE_MAX_LENGTH}자 이하로 입력하세요`),
  address: z
    .string()
    .trim()
    .max(MEMO_ADDRESS_MAX_LENGTH, `주소는 ${MEMO_ADDRESS_MAX_LENGTH}자 이하로 입력하세요`)
    .nullable()
    .transform((value) => (value ? value : null)),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  body: z.string().max(MEMO_BODY_MAX_LENGTH, `메모는 ${MEMO_BODY_MAX_LENGTH}자 이하로 입력하세요`),
  naverPlaceId: z.string().max(NAVER_PLACE_ID_MAX_LENGTH).nullable(),
  // 미지정 = 분류 없음. 그룹 소유자 확인은 DB 트리거(memos_group_owner_check)가 한다.
  groupId: z.uuid('그룹을 다시 골라 주세요').nullable().optional(),
});

export const memoPatchSchema = memoInputSchema.partial();

export type MemoInput = z.input<typeof memoInputSchema>;
export type MemoPatch = z.input<typeof memoPatchSchema>;
