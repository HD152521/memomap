-- 보안 수정: memo_promise_shares 에 직접 INSERT/UPDATE 가 열려 있어, 남의 메모 id 로 내 약속 링크를 만들어
-- promise-view 로 그 메모의 비번을 읽을 수 있었다(그룹 공유 복사본의 source_memo_id 로 원본 id 를 알 수 있음).
-- → 클라이언트 쓰기 권한을 없애고, 소유자 확인을 하는 함수(security definer)로만 쓰게 한다. 토큰도 서버만 만든다.

drop policy "memo_promise_shares_insert_own" on public.memo_promise_shares;
drop policy "memo_promise_shares_update_own" on public.memo_promise_shares;
drop policy "memo_promise_shares_delete_own" on public.memo_promise_shares;
revoke insert, update, delete on public.memo_promise_shares from authenticated;

create or replace function public.create_promise_share(p_memo_id uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_has_date boolean;
  existing text;
  new_token text;
begin
  select m.promise_start is not null into v_has_date from public.memos m where m.id = p_memo_id and m.user_id = uid;
  if uid is null or v_has_date is null then
    raise exception 'memo not found' using errcode = '42501';
  end if;
  if not v_has_date then
    raise exception 'PROMISE_DATE_REQUIRED' using errcode = '22023';
  end if;

  select s.token into existing from public.memo_promise_shares s where s.memo_id = p_memo_id and s.revoked_at is null;
  if existing is not null then
    return existing;
  end if;

  new_token := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
  insert into public.memo_promise_shares (memo_id, user_id, token) values (p_memo_id, uid, new_token);
  return new_token;
end;
$$;

revoke execute on function public.create_promise_share(uuid) from public, anon;
grant execute on function public.create_promise_share(uuid) to authenticated;

create or replace function public.revoke_promise_share(p_memo_id uuid) returns void
language sql
security definer
set search_path = ''
as $$
  update public.memo_promise_shares s set revoked_at = now()
  where s.memo_id = p_memo_id and s.revoked_at is null
    and exists (select 1 from public.memos m where m.id = p_memo_id and m.user_id = auth.uid());
$$;

revoke execute on function public.revoke_promise_share(uuid) from public, anon;
grant execute on function public.revoke_promise_share(uuid) to authenticated;

-- 약속 날짜를 지우면 링크를 끈다. 사용자에게 UPDATE 권한이 없으므로 definer 로 실행한다(대상은 그 메모의 링크뿐).
create or replace function public.memos_promise_cleared() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.promise_start is null and old.promise_start is not null then
    update public.memo_promise_shares set revoked_at = now() where memo_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.memos_promise_cleared() from public, anon, authenticated;
