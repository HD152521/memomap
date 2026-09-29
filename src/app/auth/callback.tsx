import { Redirect } from 'expo-router';

// 카카오 OAuth 리다이렉트(memomap://auth/callback?code=…)가 라우터로도 전달될 때 빈 화면/404가 뜨지 않게 한다.
// 실제 code 교환은 signInWithKakao 에서 openAuthSessionAsync 결과로 처리한다.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
