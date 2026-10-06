-- Phase 2: 그룹 공유 링크. 받는 사람은 이 테이블에 직접 접근하지 않고 Edge Function(import-share, service role)이 토큰을 조회한다.
create table public.group_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.memo_groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique check (char_length(token) between 24 and 64),
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

-- 그룹당 활성 링크는 하나.
create unique index group_shares_active_idx on public.group_shares (group_id) where revoked_at is null;

grant select, insert, update, delete on public.group_shares to authenticated;
revoke all on public.group_shares from anon;

alter table public.group_shares enable row level security;

create policy "group_shares_select_own" on public.group_shares
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "group_shares_insert_own" on public.group_shares
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "group_shares_update_own" on public.group_shares
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "group_shares_delete_own" on public.group_shares
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 공유받아 복사된 그룹/메모의 출처. 같은 공유를 다시 가져오면 같은 복사본을 갱신하는 키로 쓴다.
alter table public.memo_groups
  add column source_share_id uuid null references public.group_shares (id) on delete set null;
create unique index memo_groups_user_source_idx on public.memo_groups (user_id, source_share_id)
  where source_share_id is not null;

alter table public.memos add column source_memo_id uuid null;

-- 링크 생성: 내 그룹이면 활성 토큰을 돌려주고, 없으면 새로 만든다.
create function public.create_group_share(p_group_id uuid) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing text;
  new_token text;
begin
  if uid is null or not exists (select 1 from public.memo_groups g where g.id = p_group_id and g.user_id = uid) then
    raise exception 'group not found' using errcode = '42501';
  end if;

  select s.token into existing from public.group_shares s where s.group_id = p_group_id and s.revoked_at is null;
  if existing is not null then
    return existing;
  end if;

  new_token := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  insert into public.group_shares (group_id, token) values (p_group_id, new_token);
  return new_token;
end;
$$;

revoke execute on function public.create_group_share(uuid) from public, anon;
grant execute on function public.create_group_share(uuid) to authenticated;

-- 링크 끄기.
create function public.revoke_group_share(p_group_id uuid) returns void
language sql
security invoker
set search_path = ''
as $$
  update public.group_shares set revoked_at = now()
  where group_id = p_group_id and user_id = auth.uid() and revoked_at is null;
$$;

revoke execute on function public.revoke_group_share(uuid) from public, anon;
grant execute on function public.revoke_group_share(uuid) to authenticated;

-- 공유 가져오기 남용 방지: 사용자별 일일 횟수 (search_usage 와 같은 방식).
create table public.import_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  count integer not null default 0,
  primary key (user_id, day)
);
alter table public.import_usage enable row level security;
revoke all on public.import_usage from anon, authenticated;
