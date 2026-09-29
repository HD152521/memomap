import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { AppError, toAppError } from '@/lib/appError';
import { supabase } from '@/lib/supabase';

export const AUTH_CALLBACK_PATH = 'auth/callback';

type CallbackResult = { kind: 'code'; code: string } | { kind: 'denied' } | { kind: 'invalid' };

const USER_DENIED = 'access_denied';

function parseCallback(url: string): CallbackResult {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  if (typeof code === 'string' && code) return { kind: 'code', code };
  // 카카오 동의 화면에서 취소하면 error=access_denied 로 돌아온다 → 실패가 아니라 취소로 본다.
  if (queryParams?.error === USER_DENIED) return { kind: 'denied' };
  return { kind: 'invalid' };
}

/**
 * Supabase OAuth(PKCE) 웹 플로우. 네이티브 카카오 SDK의 id_token audience 이슈를 피한다.
 * @returns false if the user canceled, true when signed in.
 */
export async function signInWithKakao(): Promise<boolean> {
  const redirectTo = Linking.createURL(AUTH_CALLBACK_PATH);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw toAppError(error);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;

  const callback = parseCallback(result.url);
  if (callback.kind === 'denied') return false;
  if (callback.kind === 'invalid') throw new AppError('AUTH', '카카오 로그인에 실패했습니다');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(callback.code);
  if (exchangeError) throw toAppError(exchangeError);

  return true;
}
