import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { AppError, toAppError } from '@/lib/appError';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

const CANCELED = 'ERR_REQUEST_CANCELED';

function isCanceled(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === CANCELED;
}

function formatName(fullName: AppleAuthentication.AppleAuthenticationFullName | null): string | null {
  if (!fullName) return null;
  const name = [fullName.familyName, fullName.givenName].filter(Boolean).join('');
  return name || null;
}

/** @returns false if the user canceled, true when signed in. */
export async function signInWithApple(): Promise<boolean> {
  // 토큰 재사용 방지: Apple에는 해시를, Supabase에는 원문 nonce를 보낸다.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (e) {
    if (isCanceled(e)) return false;
    throw toAppError(e);
  }

  if (!credential.identityToken) throw new AppError('AUTH', 'Apple 로그인에 실패했습니다');

  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
  if (error) throw toAppError(error);

  // Apple은 이름을 최초 로그인 때만 준다 → 바로 저장한다. 실패해도 로그인은 유지.
  const fullName = formatName(credential.fullName);
  if (fullName) {
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (updateError) logger.warn('apple full_name update failed', { message: updateError.message });
  }

  return true;
}
