-- 로컬 검증용: Supabase의 auth 스키마 최소 흉내 (실 Supabase에는 적용하지 않는다)
-- postgis 이미지는 확장을 public에 미리 설치한다. Supabase처럼 extensions 스키마에 설치되도록 제거.
drop extension if exists postgis_tiger_geocoder cascade;
drop extension if exists postgis_topology cascade;
drop extension if exists fuzzystrmatch cascade;
drop extension if exists postgis cascade;
create schema if not exists auth;
create schema if not exists extensions;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
end $$;
grant usage on schema public, auth, extensions to authenticated;
grant execute on function auth.uid() to authenticated;
