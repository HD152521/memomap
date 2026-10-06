-- Phase 2 리뷰 반영: 공유 가져오기/되돌리기의 행 작업을 단일 트랜잭션 SQL 함수로 옮긴다.
-- (중간 실패 시 이전 복사본·한도 차감이 함께 롤백되도록.) 사진 파일 복사만 Edge Function 이 맡는다.

-- 메모가 어느 공유에서 왔는지. 다시 가져오기/되돌리기는 이 값으로만 대상 메모를 고른다
-- (받은 사람이 그룹을 옮기거나 직접 추가한 메모를 건드리지 않기 위해).
alter table public.memos
  add column source_share_id uuid null references public.group_shares (id) on delete set null;
create index memos_user_source_share_idx on public.memos (user_id, source_share_id) where source_share_id is not null;

-- 공유 링크는 그룹 소유자만 만들 수 있다(RLS with check 는 group_id 소유자를 확인하지 못함).
create function public.group_shares_owner_check() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.memo_groups g where g.id = new.group_id and g.user_id = new.user_id) then
    raise exception 'group does not belong to share owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger group_shares_owner_check
  before insert or update of group_id, user_id on public.group_shares
  for each row execute function public.group_shares_owner_check();

-- 가져오기. 오류는 메시지 코드(SHARE_NOT_FOUND, OWN_SHARE, SHARE_TOO_LARGE, RATE_LIMITED)로 올린다.
-- 반환: { group_id, group_name, mode, memo_count, photos: [{memo_id, path, width, height, position}], old_paths: [] }
create function public.import_share_copy(
  p_caller uuid,
  p_token text,
  p_max_memos integer default 300,
  p_max_photos integer default 300,
  p_daily_limit integer default 50
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share record;
  v_source record;
  v_copy record;
  v_mode text;
  v_group_id uuid;
  v_group_name text;
  v_suffix text;
  v_n integer := 1;
  v_used integer;
  v_memo_count integer;
  v_photo_count integer;
  v_old_paths text[];
  v_photos jsonb;
begin
  select s.id, s.group_id, s.user_id into v_share
  from public.group_shares s
  where s.token = p_token and s.revoked_at is null;
  if not found then
    raise exception 'SHARE_NOT_FOUND';
  end if;
  if v_share.user_id = p_caller then
    raise exception 'OWN_SHARE';
  end if;

  select g.name, g.emoji, g.color, g.user_id into v_source from public.memo_groups g where g.id = v_share.group_id;
  if not found or v_source.user_id <> v_share.user_id then
    raise exception 'SHARE_NOT_FOUND';
  end if;

  select count(*) into v_memo_count from public.memos m where m.group_id = v_share.group_id and m.user_id = v_share.user_id;
  select count(*) into v_photo_count
  from public.memo_photos p join public.memos m on m.id = p.memo_id
  where m.group_id = v_share.group_id and m.user_id = v_share.user_id;
  if v_memo_count > p_max_memos or v_photo_count > p_max_photos then
    raise exception 'SHARE_TOO_LARGE';
  end if;

  -- 일일 한도: 원자적 증가. 아래에서 실패하면 함께 롤백된다.
  insert into public.import_usage as u (user_id, day, count)
  values (p_caller, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (user_id, day) do update set count = u.count + 1
  returning u.count into v_used;
  if v_used > p_daily_limit then
    raise exception 'RATE_LIMITED';
  end if;

  -- 이 공유에서 왔던 메모(그룹을 옮겼어도)를 모두 교체 대상으로 잡는다. 파일 경로는 커밋 후 삭제용으로 돌려준다.
  select coalesce(array_agg(p.path), '{}') into v_old_paths
  from public.memo_photos p join public.memos m on m.id = p.memo_id
  where m.user_id = p_caller and m.source_share_id = v_share.id;
  delete from public.memos m where m.user_id = p_caller and m.source_share_id = v_share.id;

  select g.id, g.name into v_copy from public.memo_groups g where g.user_id = p_caller and g.source_share_id = v_share.id;
  if found then
    v_mode := 'updated';
    v_group_id := v_copy.id;
    v_group_name := v_copy.name;
    update public.memo_groups set emoji = v_source.emoji, color = v_source.color where id = v_group_id;
  else
    v_mode := 'created';
    v_group_name := v_source.name;
    while exists (select 1 from public.memo_groups g where g.user_id = p_caller and g.name = v_group_name) loop
      v_suffix := case when v_n = 1 then ' (공유)' else ' (공유 ' || v_n || ')' end;
      v_group_name := left(v_source.name, 30 - char_length(v_suffix)) || v_suffix;
      v_n := v_n + 1;
    end loop;
    insert into public.memo_groups (user_id, name, emoji, color, source_share_id)
    values (p_caller, v_group_name, v_source.emoji, v_source.color, v_share.id)
    returning id into v_group_id;
  end if;

  with src as (
    select m.id, m.title, m.address, m.naver_place_id, m.body, m.location
    from public.memos m
    where m.group_id = v_share.group_id and m.user_id = v_share.user_id
  ), ins as (
    insert into public.memos (user_id, title, address, naver_place_id, body, location, group_id, source_memo_id, source_share_id)
    select p_caller, src.title, src.address, src.naver_place_id, src.body, src.location, v_group_id, src.id, v_share.id
    from src
    returning id, source_memo_id
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('memo_id', ins.id, 'path', p.path, 'width', p.width, 'height', p.height, 'position', p.position)),
    '[]'::jsonb
  )
  into v_photos
  from ins join public.memo_photos p on p.memo_id = ins.source_memo_id;

  return jsonb_build_object(
    'group_id', v_group_id,
    'group_name', v_group_name,
    'mode', v_mode,
    'memo_count', v_memo_count,
    'photos', v_photos,
    'old_paths', to_jsonb(v_old_paths)
  );
end;
$$;

-- 되돌리기: 방금(기본 10분 이내) 새로 만든 복사본만. 이 공유에서 온 메모만 지우고,
-- 받은 사람이 그 그룹에 직접 넣은 메모는 그룹 삭제(on delete set null)로 '분류 없음'에 남는다.
create function public.undo_share_import(
  p_caller uuid,
  p_token text,
  p_group_id uuid,
  p_window interval default interval '10 minutes'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share_id uuid;
  v_paths text[];
begin
  select s.id into v_share_id from public.group_shares s where s.token = p_token;
  if not found or not exists (
    select 1 from public.memo_groups g
    where g.id = p_group_id and g.user_id = p_caller and g.source_share_id = v_share_id and g.created_at > now() - p_window
  ) then
    raise exception 'NOTHING_TO_UNDO';
  end if;

  select coalesce(array_agg(p.path), '{}') into v_paths
  from public.memo_photos p join public.memos m on m.id = p.memo_id
  where m.user_id = p_caller and m.source_share_id = v_share_id;
  delete from public.memos m where m.user_id = p_caller and m.source_share_id = v_share_id;
  delete from public.memo_groups g where g.id = p_group_id and g.user_id = p_caller;

  return jsonb_build_object('paths', to_jsonb(v_paths));
end;
$$;

-- service role(Edge Function) 전용.
revoke execute on function public.import_share_copy(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.undo_share_import(uuid, text, uuid, interval) from public, anon, authenticated;
grant execute on function public.import_share_copy(uuid, text, integer, integer, integer) to service_role;
grant execute on function public.undo_share_import(uuid, text, uuid, interval) to service_role;
