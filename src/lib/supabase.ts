import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import './webCryptoPolyfill';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from './env';

export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // 카카오 OAuth는 앱으로 돌아온 code를 exchangeCodeForSession으로 교환한다.
    flowType: 'pkce',
  },
});

// 앱이 포그라운드일 때만 토큰 자동 갱신을 돌린다 (Supabase RN 가이드).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
