-- 네이버 검색 API 일일 할당량(앱 전체 25,000회)을 한 사용자가 소진하지 못하도록 사용자별 일일 한도를 둔다.
create table public.search_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  count integer not null default 0,
  primary key (user_id, day)
);

-- 클라이언트가 직접 읽고 쓰지 못하게 RLS만 켜고 정책은 두지 않는다. 접근은 아래 함수로만.
alter table public.search_usage enable row level security;

create function public.consume_search_quota(daily_limit integer default 300)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  used integer;
begin
  if uid is null then
    return false;
  end if;

  insert into public.search_usage as su (user_id, day, count)
  values (uid, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (user_id, day) do update set count = su.count + 1
  returning su.count into used;

  return used <= daily_limit;
end;
$$;

revoke execute on function public.consume_search_quota(integer) from public, anon;
grant execute on function public.consume_search_quota(integer) to authenticated;
