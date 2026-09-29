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
