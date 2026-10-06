import type { ZodType } from 'zod';

import { toAppError, validationError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';

import { groupInputSchema, groupPatchSchema, type GroupInput, type GroupPatch } from './groupSchema';
import type { MemoGroup, MemoGroupRow } from './types';

const TABLE = 'memo_groups';
const SELECT_WITH_COUNT = 'id, name, emoji, color, source_share_id, memos(count)';

export function toGroup(row: MemoGroupRow): MemoGroup {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    sourceShareId: row.source_share_id,
    memoCount: row.memos?.[0]?.count ?? 0,
  };
}

const UNIQUE_VIOLATION = '23505';

function toGroupError(e: { code?: string } | Error) {
  if ('code' in e && e.code === UNIQUE_VIOLATION) return validationError('같은 이름의 그룹이 있어요');
  return toAppError(e);
}

function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error.issues[0]?.message ?? '');
  return result.data;
}

export const groupRepository = {
  async listMine(): Promise<MemoGroup[]> {
    const { data, error } = await supabase.from(TABLE).select(SELECT_WITH_COUNT).order('created_at', { ascending: true }).returns<MemoGroupRow[]>();
    if (error) throw toAppError(error);
    return data.map(toGroup);
  },

  async create(input: GroupInput): Promise<MemoGroup> {
    const values = parseOrThrow(groupInputSchema, input);
    // user_id는 보내지 않는다: DB default auth.uid() + RLS with check.
    const { data, error } = await supabase.from(TABLE).insert(values).select(SELECT_WITH_COUNT).single<MemoGroupRow>();
    if (error) throw toGroupError(error);
    return toGroup(data);
  },

  async update(id: string, patch: GroupPatch): Promise<MemoGroup> {
    const values = parseOrThrow(groupPatchSchema, patch);
    const { data, error } = await supabase.from(TABLE).update(values).eq('id', id).select(SELECT_WITH_COUNT).single<MemoGroupRow>();
    if (error) throw toGroupError(error);
    return toGroup(data);
  },

  async remove(id: string): Promise<void> {
    // 그룹을 지우면 소속 메모는 DB에서 group_id = null(분류 없음)이 된다.
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw toAppError(error);
  },
};
