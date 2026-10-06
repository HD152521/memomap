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
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public, auth, extensions to authenticated;
grant execute on function auth.uid() to authenticated;

-- Phase 2: pgcrypto(gen_random_bytes)와 Supabase storage 스키마 최소 흉내
create extension if not exists pgcrypto with schema extensions;
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid()
);
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
