-- Phase 1: 개인 메모 (장소 + 자유 글). 카테고리/입력 칸은 Phase 2 마이그레이션에서 추가.
create extension if not exists postgis with schema extensions;

create table public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  address text check (char_length(address) <= 200),
  naver_place_id text check (char_length(naver_place_id) <= 50),
  location extensions.geography(Point, 4326) not null,
  body text not null default '' check (char_length(body) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memos_location_idx on public.memos using gist (location);
create index memos_user_updated_idx on public.memos (user_id, updated_at desc);

-- 새 테이블 자동 노출 설정에 기대지 않고 명시적으로 권한을 준다. 행 단위 제한은 아래 RLS가 담당.
grant select, insert, update, delete on public.memos to authenticated;

alter table public.memos enable row level security;

create policy "memos_select_own" on public.memos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "memos_insert_own" on public.memos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "memos_update_own" on public.memos
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "memos_delete_own" on public.memos
  for delete to authenticated using ((select auth.uid()) = user_id);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memos_set_updated_at
  before update on public.memos
  for each row execute function public.set_updated_at();

-- geography는 PostgREST에서 hex WKB로 나오므로 lat/lng를 풀어 노출한다.
-- security_invoker = true 가 없으면 뷰 소유자 권한으로 실행되어 RLS가 우회된다.
create view public.memos_with_coords
with (security_invoker = true) as
select
  id,
  user_id,
  title,
  address,
  naver_place_id,
  body,
  created_at,
  updated_at,
  extensions.st_y(location::extensions.geometry) as lat,
  extensions.st_x(location::extensions.geometry) as lng
from public.memos;

grant select on public.memos_with_coords to authenticated;
