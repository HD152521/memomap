-- v3 공간 메모장: 한 줄 메모 + 필요할 때 붙이는 칩(🔒 비번 · 🗓 시기 · 👥 약속).

-- 1) 한 줄 메모: 핀만 찍고 나중에 써도 되도록 빈 제목을 허용한다(앱은 "이름 없는 메모"로 표시).
alter table public.memos drop constraint memos_title_check;
alter table public.memos add constraint memos_title_check check (char_length(title) <= 100);
alter table public.memos alter column title set default '';

-- 2) 🔒 비번(숨김 메모): 지도·목록·그룹 공유에는 나가지 않는다. 그룹 공유 복사(import_share_copy)는
--    컬럼을 명시해 복사하므로 이 값은 복사되지 않는다.
alter table public.memos add column secret_note text null check (char_length(secret_note) between 1 and 500);

-- 3) 🗓 시기: 보이는 달(1~12)·요일(0=일~6=토). null = 항상.
alter table public.memos add column visible_months smallint[] null
  check (visible_months is null or (cardinality(visible_months) between 1 and 12 and visible_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]));
alter table public.memos add column visible_weekdays smallint[] null
  check (visible_weekdays is null or (cardinality(visible_weekdays) between 1 and 7 and visible_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]));

-- 4) 👥 약속: 날짜(하루 또는 최대 30일 기간)가 있는 메모. 공유 링크는 아래 memo_promise_shares.
alter table public.memos add column promise_start date null;
alter table public.memos add column promise_end date null;
alter table public.memos add constraint memos_promise_range_check check (
  promise_end is null or (promise_start is not null and promise_end between promise_start and promise_start + 30)
);

-- 뷰에 새 컬럼 추가(기존 컬럼 뒤에만 추가 가능).
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
  group_id,
  secret_note,
  visible_months,
  visible_weekdays,
  promise_start,
  promise_end
from public.memos;

grant select on public.memos_with_coords to authenticated;
revoke all on public.memos_with_coords from anon;

-- 5) 약속 공유 링크. 받는 사람은 테이블에 접근하지 않고 Edge Function(promise-view, service role)이 토큰으로 조회한다.
create table public.memo_promise_shares (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references public.memos (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique check (char_length(token) between 24 and 64),
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

-- 메모당 활성 링크는 하나.
create unique index memo_promise_shares_active_idx on public.memo_promise_shares (memo_id) where revoked_at is null;

grant select, insert, update, delete on public.memo_promise_shares to authenticated;
revoke all on public.memo_promise_shares from anon;

alter table public.memo_promise_shares enable row level security;

create policy "memo_promise_shares_select_own" on public.memo_promise_shares
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "memo_promise_shares_insert_own" on public.memo_promise_shares
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "memo_promise_shares_update_own" on public.memo_promise_shares
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "memo_promise_shares_delete_own" on public.memo_promise_shares
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 링크 생성: 내 메모이고 약속 날짜가 있으면 활성 토큰을 돌려주고, 없으면 새로 만든다.
create function public.create_promise_share(p_memo_id uuid) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing text;
  new_token text;
begin
  if uid is null or not exists (select 1 from public.memos m where m.id = p_memo_id and m.user_id = uid) then
    raise exception 'memo not found' using errcode = '42501';
  end if;
  if not exists (select 1 from public.memos m where m.id = p_memo_id and m.promise_start is not null) then
    raise exception 'PROMISE_DATE_REQUIRED' using errcode = '22023';
  end if;

  select s.token into existing from public.memo_promise_shares s where s.memo_id = p_memo_id and s.revoked_at is null;
  if existing is not null then
    return existing;
  end if;

  new_token := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  insert into public.memo_promise_shares (memo_id, token) values (p_memo_id, new_token);
  return new_token;
end;
$$;

revoke execute on function public.create_promise_share(uuid) from public, anon;
grant execute on function public.create_promise_share(uuid) to authenticated;

-- 링크 끄기.
create function public.revoke_promise_share(p_memo_id uuid) returns void
language sql
security invoker
set search_path = ''
as $$
  update public.memo_promise_shares set revoked_at = now()
  where memo_id = p_memo_id and user_id = auth.uid() and revoked_at is null;
$$;

revoke execute on function public.revoke_promise_share(uuid) from public, anon;
grant execute on function public.revoke_promise_share(uuid) to authenticated;

-- 약속 날짜를 지우면 링크도 끈다(날짜 없는 메모가 링크로 계속 열리지 않게).
create function public.memos_promise_cleared() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.promise_start is null and old.promise_start is not null then
    update public.memo_promise_shares set revoked_at = now() where memo_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

create trigger memos_promise_cleared
  after update of promise_start on public.memos
  for each row execute function public.memos_promise_cleared();
