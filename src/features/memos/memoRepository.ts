import type { ZodType } from 'zod';

import { toAppError, validationError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';

import { toEwktPoint } from './geo';
import { memoInputSchema, memoPatchSchema, type MemoInput, type MemoPatch } from './memoSchema';
import type { Memo, MemoRow } from './types';

const TABLE = 'memos';
const VIEW = 'memos_with_coords';

export function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    title: row.title,
    address: row.address,
    naverPlaceId: row.naver_place_id,
    lat: row.lat,
    lng: row.lng,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error.issues[0]?.message ?? '');
  return result.data;
}

type WritableColumns = {
  title?: string;
  address?: string | null;
  naver_place_id?: string | null;
  body?: string;
  location?: string;
};

function toWritableColumns(values: Partial<{ title: string; address: string | null; naverPlaceId: string | null; body: string; lat: number; lng: number }>): WritableColumns {
  const columns: WritableColumns = {};
  if (values.title !== undefined) columns.title = values.title;
  if (values.address !== undefined) columns.address = values.address;
  if (values.naverPlaceId !== undefined) columns.naver_place_id = values.naverPlaceId;
  if (values.body !== undefined) columns.body = values.body;
  if (values.lat !== undefined && values.lng !== undefined) columns.location = toEwktPoint(values.lat, values.lng);
  return columns;
}

async function getById(id: string): Promise<Memo> {
  const { data, error } = await supabase.from(VIEW).select('*').eq('id', id).single<MemoRow>();
  if (error) throw toAppError(error);
  return toMemo(data);
}

export const memoRepository = {
  async listMine(): Promise<Memo[]> {
    const { data, error } = await supabase.from(VIEW).select('*').order('updated_at', { ascending: false }).returns<MemoRow[]>();
    if (error) throw toAppError(error);
    return data.map(toMemo);
  },

  getById,

  async create(input: MemoInput): Promise<Memo> {
    const values = parseOrThrow(memoInputSchema, input);
    // user_id는 보내지 않는다: DB default auth.uid() + RLS with check.
    // 재조회 없이 입력값으로 결과를 만든다: 두 번째 요청이 실패하면 이미 저장된 메모를 사용자가 다시 저장해 중복이 생기기 때문.
    const { data, error } = await supabase
      .from(TABLE)
      .insert(toWritableColumns(values))
      .select('id, created_at, updated_at')
      .single<{ id: string; created_at: string; updated_at: string }>();
    if (error) throw toAppError(error);
    return {
      id: data.id,
      title: values.title,
      address: values.address,
      naverPlaceId: values.naverPlaceId,
      lat: values.lat,
      lng: values.lng,
      body: values.body,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async update(id: string, patch: MemoPatch): Promise<Memo> {
    const values = parseOrThrow(memoPatchSchema, patch);
    const { error } = await supabase.from(TABLE).update(toWritableColumns(values)).eq('id', id).select('id').single();
    if (error) throw toAppError(error);
    return getById(id);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw toAppError(error);
  },
};
