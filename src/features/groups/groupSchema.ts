import { z } from 'zod';

import { GROUP_COLORS } from './groupColors';

export const GROUP_NAME_MAX_LENGTH = 30;

// DB CHECK(20261003000000_groups.sql)와 같은 한도를 유지할 것.
export const groupInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '그룹 이름을 입력하세요')
    .max(GROUP_NAME_MAX_LENGTH, `그룹 이름은 ${GROUP_NAME_MAX_LENGTH}자 이하로 입력하세요`),
  emoji: z.string().trim().min(1, '이모지를 골라 주세요').max(8, '이모지는 하나만 넣어 주세요'),
  color: z.enum(GROUP_COLORS, { message: '색상을 골라 주세요' }),
});

export const groupPatchSchema = groupInputSchema.partial();

export type GroupInput = z.input<typeof groupInputSchema>;
export type GroupPatch = z.input<typeof groupPatchSchema>;
