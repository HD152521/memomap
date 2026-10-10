import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';

const SHORT_SECRET_MAX = 12;
const COPIED_FEEDBACK_MS = 1500;

/**
 * 🔒 비번: 가린 채로 두고 탭하면 보인다. 짧은 값(도어락 번호 등)은 화장실 앞에서 바로 읽히게 크게.
 */
export function SecretReveal({ secret }: { secret: string }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isShort = secret.length <= SHORT_SECRET_MAX && !secret.includes('\n');

  const copy = async () => {
    await Clipboard.setStringAsync(secret);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>🔒 비번</Text>
      <Pressable
        testID="secret-reveal"
        accessibilityRole="button"
        accessibilityLabel={isRevealed ? '비번 가리기' : '비번 보기'}
        onPress={() => setIsRevealed((prev) => !prev)}
        style={styles.valueRow}
      >
        {isRevealed ? (
          <Text selectable style={[styles.value, isShort && styles.valueShort]} testID="secret-value">
            {secret}
          </Text>
        ) : (
          <Text style={styles.masked}>••••••  탭해서 보기</Text>
        )}
      </Pressable>
      {isRevealed && (
        <Pressable testID="secret-copy" accessibilityRole="button" onPress={copy} style={styles.copy}>
          <Text style={styles.copyText}>{isCopied ? '복사했어요' : '복사'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: spacing.sm },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.inkMuted },
  valueRow: { minHeight: 44, justifyContent: 'center' },
  value: { fontSize: fontSize.title, color: colors.ink },
  valueShort: { fontSize: 34, fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'] },
  masked: { fontSize: fontSize.body, color: colors.inkMuted, letterSpacing: 1 },
  copy: { alignSelf: 'flex-start', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  copyText: { fontSize: fontSize.caption + 1, color: colors.ink, fontWeight: '600' },
});
