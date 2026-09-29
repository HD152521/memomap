import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signInWithApple } from '@/features/auth/signInWithApple';
import { signInWithKakao } from '@/features/auth/signInWithKakao';
import { toAppError } from '@/lib/appError';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

type Provider = 'apple' | 'kakao';

export default function LoginScreen() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = async (provider: Provider, signIn: () => Promise<boolean>) => {
    setPending(provider);
    setErrorMessage(null);
    try {
      await signIn();
    } catch (e) {
      setErrorMessage(toAppError(e).userMessage);
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.pin}>📍</Text>
        <Text style={styles.title}>메모 지도</Text>
        <Text style={styles.subtitle}>화장실 비번, 단골 카페, 먹었던 메뉴까지{'\n'}장소마다 나만의 메모를 남겨요</Text>
      </View>

      <View style={styles.actions}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={styles.appleButton}
            onPress={() => pending === null && run('apple', signInWithApple)}
          />
        )}
        <Pressable
          testID="kakao-login"
          accessibilityRole="button"
          accessibilityState={{ disabled: pending !== null, busy: pending === 'kakao' }}
          disabled={pending !== null}
          onPress={() => run('kakao', signInWithKakao)}
          style={({ pressed }) => [styles.kakaoButton, pressed && styles.pressed, pending !== null && styles.disabled]}
        >
          <Text style={styles.kakaoLabel}>{pending === 'kakao' ? '카카오 로그인 중…' : '카카오로 계속하기'}</Text>
        </Pressable>
        {errorMessage && (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.xl },
  hero: { flex: 1, justifyContent: 'center' },
  pin: { fontSize: 44, marginBottom: spacing.md },
  title: { fontSize: fontSize.hero + 8, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: spacing.md, fontSize: fontSize.body + 1, lineHeight: 24, color: colors.inkMuted },
  actions: { gap: spacing.md, paddingBottom: spacing.xxl },
  appleButton: { height: 52 },
  kakaoButton: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.kakao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoLabel: { color: colors.kakaoText, fontSize: fontSize.body + 1, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, textAlign: 'center', fontSize: fontSize.body },
});
