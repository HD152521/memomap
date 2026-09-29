-- Supabase는 public 스키마 객체에 anon(비로그인) 권한을 기본 부여한다.
-- RLS로 행은 막히지만, 로그인 전용 데이터이므로 권한 자체를 회수한다(최소 권한).
revoke all on public.memos from anon;
revoke all on public.memos_with_coords from anon;
revoke all on public.search_usage from anon, authenticated;
