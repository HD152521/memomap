-- Phase 2: 메모 그룹(맛집, 꿀팁, 계곡 …). 메모 1개는 그룹 0~1개(group_id nullable).
create table public.memo_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  emoji text not null default '📍' check (char_length(emoji) between 1 and 8),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create trigger memo_groups_set_updated_at
  before update on public.memo_groups
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.memo_groups to authenticated;
revoke all on public.memo_groups from anon;

alter table public.memo_groups enable row level security;

create policy "memo_groups_select_own" on public.memo_groups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "memo_groups_insert_own" on public.memo_groups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "memo_groups_update_own" on public.memo_groups
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "memo_groups_delete_own" on public.memo_groups
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.memos
  add column group_id uuid null references public.memo_groups (id) on delete set null;

create index memos_user_group_idx on public.memos (user_id, group_id);

-- RLS with check 는 FK 대상의 소유자를 확인하지 못한다 → 남의 그룹 id를 내 메모에 넣는 것을 트리거로 막는다.
create function public.memos_group_owner_check() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.group_id is not null and not exists (
    select 1 from public.memo_groups g where g.id = new.group_id and g.user_id = new.user_id
  ) then
    raise exception 'group does not belong to memo owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger memos_group_owner_check
  before insert or update of group_id, user_id on public.memos
  for each row execute function public.memos_group_owner_check();

-- 뷰에 group_id 추가. create or replace view 는 기존 컬럼 뒤에만 추가할 수 있다.
create or replace view public.memos_with_coords
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
  extensions.st_x(location::extensions.geometry) as lng,
  group_id
from public.memos;

grant select on public.memos_with_coords to authenticated;
revoke all on public.memos_with_coords from anon;
