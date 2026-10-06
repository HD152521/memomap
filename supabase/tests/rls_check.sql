-- 마이그레이션 적용 후 실행: PostGIS 좌표, 뷰 lat/lng, RLS 격리, CHECK 제약, updated_at 트리거
\set ON_ERROR_STOP on
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.memos (title, location, body) values ('스타벅스 강남점', 'SRID=4326;POINT(127.0276 37.4979)', '비번 1234');

-- 1) 뷰 좌표: lat=37.4979, lng=127.0276 (순서 뒤바뀜 없음)
select 'coords' as check, lat, lng, (lat = 37.4979 and lng = 127.0276) as ok from public.memos_with_coords;

-- 2) 다른 사용자는 0건 (테이블·뷰 모두)
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select 'rls_table' as check, count(*) = 0 as ok from public.memos;
select 'rls_view' as check, count(*) = 0 as ok from public.memos_with_coords;

-- 3) 다른 사용자는 수정·삭제도 0건
with u as (update public.memos set body = 'hacked' returning 1) select 'rls_update' as check, count(*) = 0 as ok from u;
with d as (delete from public.memos returning 1) select 'rls_delete' as check, count(*) = 0 as ok from d;

-- 4) 남의 user_id로 insert 시도 → 거부
do $$ begin
  insert into public.memos (user_id, title, location) values ('11111111-1111-1111-1111-111111111111', 'x', 'SRID=4326;POINT(127 37)');
  raise exception 'FAIL: insert with foreign user_id succeeded';
exception when insufficient_privilege then raise notice 'rls_insert_foreign ok';
end $$;

-- 5) CHECK 제약: 빈 제목 거부
do $$ begin
  insert into public.memos (title, location) values ('', 'SRID=4326;POINT(127 37)');
  raise exception 'FAIL: empty title accepted';
exception when check_violation then raise notice 'check_title ok';
end $$;

-- 6) updated_at 트리거
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select pg_sleep(0.01);
with u as (update public.memos set body = '수정' returning updated_at > created_at as bumped)
select 'updated_at_trigger' as check, bool_and(bumped) as ok from u;

-- 7) 반경 조회(Phase 3 대비): 강남역 1km 이내 1건
select 'st_dwithin' as check, count(*) = 1 as ok from public.memos
where extensions.st_dwithin(location, extensions.st_point(127.0276, 37.4979)::extensions.geography, 1000);

-- 8) 검색 할당량: 한도 2로 두 번 true, 세 번째 false. 테이블 직접 접근은 불가.
select 'quota_1' as check, public.consume_search_quota(2) as ok;
select 'quota_2' as check, public.consume_search_quota(2) as ok;
select 'quota_3_blocked' as check, public.consume_search_quota(2) = false as ok;
do $$ begin
  perform count(*) from public.search_usage;
  raise exception 'FAIL: search_usage readable by authenticated';
exception when insufficient_privilege then raise notice 'quota_table_hidden ok';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
select 'quota_anon_denied' as check, public.consume_search_quota(2) = false as ok; -- auth.uid() null

-- ===== Phase 2: 그룹 / 사진 / 공유 =====
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.memo_groups (name, emoji, color) values ('맛집', '🍜', '#E8553E');
update public.memos set group_id = (select id from public.memo_groups where name = '맛집');
select 'group_view_column' as check, count(*) = 1 as ok from public.memos_with_coords where group_id is not null;

-- 9) 다른 사용자는 그룹·사진·공유를 볼 수 없다
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select 'rls_groups' as check, count(*) = 0 as ok from public.memo_groups;

-- 10) 남의 그룹 id를 내 메모에 지정 → 거부
insert into public.memos (title, location) values ('B메모', 'SRID=4326;POINT(127 37)');
reset role;
do $$ declare gid uuid; begin
  select id into gid from public.memo_groups where name = '맛집';
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  set local role authenticated;
  begin
    update public.memos set group_id = gid where title = 'B메모';
    raise exception 'FAIL: foreign group assigned';
  exception when insufficient_privilege then raise notice 'group_owner_check ok';
  end;
end $$;

-- 11) 사진: 소유자 경로, 메모당 5장 제한, 남의 메모 거부
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
insert into public.memo_photos (memo_id, path, position)
select m.id, '11111111-1111-1111-1111-111111111111/' || m.id || '/' || g || '.jpg', g
from public.memos m, generate_series(0, 4) g where m.title = '스타벅스 강남점';
select 'photos_five' as check, count(*) = 5 as ok from public.memo_photos;
do $$ begin
  insert into public.memo_photos (memo_id, path, position)
    select id, '11111111-1111-1111-1111-111111111111/x/extra.jpg', 0 from public.memos where title = '스타벅스 강남점';
  raise exception 'FAIL: 6th photo accepted';
exception when check_violation or unique_violation then raise notice 'photos_limit ok';
end $$;
do $$ begin
  insert into public.memo_photos (memo_id, path, position)
    values ((select id from public.memos where title = '스타벅스 강남점'), 'not-owner/x.jpg', 4);
  raise exception 'FAIL: bad path accepted';
exception when insufficient_privilege or check_violation or unique_violation then raise notice 'photo_path_check ok';
end $$;

-- 12) Storage 정책: 내 폴더만 업로드 가능
insert into storage.objects (bucket_id, name) values ('memo-photos', '11111111-1111-1111-1111-111111111111/m/a.jpg');
select 'storage_own_insert' as check, count(*) = 1 as ok from storage.objects;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('memo-photos', '22222222-2222-2222-2222-222222222222/m/a.jpg');
  raise exception 'FAIL: foreign folder upload';
exception when insufficient_privilege then raise notice 'storage_foreign_insert ok';
end $$;

-- 13) 공유 링크 생성: 같은 토큰 재사용, 길이 ≥ 24, 남은 볼 수 없음
select 'share_token_len' as check,
  char_length(public.create_group_share((select id from public.memo_groups where name = '맛집'))) >= 24 as ok;
select 'share_token_stable' as check,
  public.create_group_share((select id from public.memo_groups where name = '맛집'))
  = public.create_group_share((select id from public.memo_groups where name = '맛집')) as ok;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select 'rls_shares' as check, count(*) = 0 as ok from public.group_shares;
reset role;
do $$ declare gid uuid; begin
  select id into gid from public.memo_groups where name = '맛집';
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  set local role authenticated;
  begin
    perform public.create_group_share(gid);
    raise exception 'FAIL: share created for foreign group';
  exception when insufficient_privilege then raise notice 'share_foreign_group ok';
  end;
end $$;

-- 14) 링크 끄기 후 새 토큰 발급
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
create temp table t_old as select token from public.group_shares;
select public.revoke_group_share((select id from public.memo_groups where name = '맛집'));
select 'share_revoke_new_token' as check,
  public.create_group_share((select id from public.memo_groups where name = '맛집')) <> (select token from t_old) as ok;

-- 15) 그룹 삭제 → 메모는 분류 없음
delete from public.memo_groups where name = '맛집';
select 'group_delete_set_null' as check, count(*) = 0 as ok from public.memos where group_id is not null;
reset role;
