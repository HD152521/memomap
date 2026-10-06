-- Phase 2: 메모 사진. 파일은 Storage 비공개 버킷 memo-photos/{user_id}/{memo_id}/{uuid}.jpg, 메타데이터는 memo_photos.
create table public.memo_photos (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references public.memos (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null unique check (char_length(path) <= 300),
  width integer check (width > 0),
  height integer check (height > 0),
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  unique (memo_id, position)
);

create index memo_photos_memo_idx on public.memo_photos (memo_id);

grant select, insert, update, delete on public.memo_photos to authenticated;
revoke all on public.memo_photos from anon;

alter table public.memo_photos enable row level security;

create policy "memo_photos_select_own" on public.memo_photos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "memo_photos_insert_own" on public.memo_photos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "memo_photos_update_own" on public.memo_photos
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "memo_photos_delete_own" on public.memo_photos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 사진 소유자 = 메모 소유자, 경로 첫 폴더 = 소유자 id, 메모당 최대 5장.
create function public.memo_photos_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.memos m where m.id = new.memo_id and m.user_id = new.user_id) then
    raise exception 'memo does not belong to photo owner' using errcode = '42501';
  end if;
  if split_part(new.path, '/', 1) <> new.user_id::text then
    raise exception 'photo path must start with owner id' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.memo_photos p where p.memo_id = new.memo_id) >= 5 then
    raise exception 'a memo can have at most 5 photos' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger memo_photos_guard
  before insert or update on public.memo_photos
  for each row execute function public.memo_photos_guard();

-- Storage 버킷(비공개, 2MB, JPEG만).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memo-photos', 'memo-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy "memo_photos_objects_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'memo-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "memo_photos_objects_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memo-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "memo_photos_objects_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'memo-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "memo_photos_objects_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memo-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
