import type { ZodType } from 'zod';

import { toAppError, validationError } from '@/lib/appError';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

import { toEwktPoint } from './geo';
import { memoInputSchema, memoPatchSchema, type MemoInput, type MemoPatch } from './memoSchema';
import type { Memo, MemoRow } from './types';

const TABLE = 'memos';
const VIEW = 'memos_with_coords';
const PHOTO_TABLE = 'memo_photos';
const PHOTO_BUCKET = 'memo-photos';

export function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    title: row.title,
    address: row.address,
    naverPlaceId: row.naver_place_id,
    groupId: row.group_id ?? null,
    lat: row.lat,
    lng: row.lng,
    body: row.body,
    secretNote: row.secret_note ?? null,
    visibleMonths: row.visible_months ?? null,
    visibleWeekdays: row.visible_weekdays ?? null,
    promiseStart: row.promise_start ?? null,
    promiseEnd: row.promise_end ?? null,
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
  group_id?: string | null;
  body?: string;
  location?: string;
  secret_note?: string | null;
  visible_months?: number[] | null;
  visible_weekdays?: number[] | null;
  promise_start?: string | null;
  promise_end?: string | null;
};

type WritableValues = Partial<{
  title: string;
  address: string | null;
  naverPlaceId: string | null;
  groupId: string | null;
  body: string;
  lat: number;
  lng: number;
  secretNote: string | null;
  visibleMonths: number[] | null;
  visibleWeekdays: number[] | null;
  promiseStart: string | null;
  promiseEnd: string | null;
}>;

function toWritableColumns(values: WritableValues): WritableColumns {
  const columns: WritableColumns = {};
  if (values.title !== undefined) columns.title = values.title;
  if (values.address !== undefined) columns.address = values.address;
  if (values.naverPlaceId !== undefined) columns.naver_place_id = values.naverPlaceId;
  if (values.groupId !== undefined) columns.group_id = values.groupId;
  if (values.body !== undefined) columns.body = values.body;
  if (values.lat !== undefined && values.lng !== undefined) columns.location = toEwktPoint(values.lat, values.lng);
  if (values.secretNote !== undefined) columns.secret_note = values.secretNote;
  if (values.visibleMonths !== undefined) columns.visible_months = values.visibleMonths;
  if (values.visibleWeekdays !== undefined) columns.visible_weekdays = values.visibleWeekdays;
  if (values.promiseStart !== undefined) columns.promise_start = values.promiseStart;
  if (values.promiseEnd !== undefined) columns.promise_end = values.promiseEnd;
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
      groupId: values.groupId ?? null,
      lat: values.lat,
      lng: values.lng,
      body: values.body,
      secretNote: values.secretNote ?? null,
      visibleMonths: values.visibleMonths ?? null,
      visibleWeekdays: values.visibleWeekdays ?? null,
      promiseStart: values.promiseStart ?? null,
      promiseEnd: values.promiseEnd ?? null,
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
    // Storage 객체는 FK가 없어 행 cascade로 지워지지 않는다. 경로를 먼저 읽고, 행을 지운 뒤 파일을 지운다
    // (행 삭제가 실패했는데 파일만 사라지는 일을 막기 위해).
    const { data: photos, error: photoError } = await supabase.from(PHOTO_TABLE).select('path').eq('memo_id', id).returns<{ path: string }[]>();
    if (photoError) throw toAppError(photoError);
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw toAppError(error);
    if (photos.length > 0) {
      const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove(photos.map((photo) => photo.path));
      // 파일 삭제 실패는 메모 삭제를 되돌리지 않는다(고아 파일은 정리 배치 대상).
      if (storageError) logger.warn('memo photo files not removed', { memoId: id, message: storageError.message });
    }
  },
};
