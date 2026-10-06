import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { toAppError } from '@/lib/appError';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { GROUP_COLORS, GROUP_SUGGESTIONS, type GroupColor } from './groupColors';
import { GROUP_NAME_MAX_LENGTH, groupInputSchema, type GroupInput } from './groupSchema';

type Props = {
  initial?: { name: string; emoji: string; color: string };
  showSuggestions?: boolean;
  submitLabel: string;
  onSubmit: (values: GroupInput) => Promise<void>;
};

type FormValues = { name: string; emoji: string; color: GroupColor };

function toPaletteColor(color: string | undefined): GroupColor {
  return (GROUP_COLORS as readonly string[]).includes(color ?? '') ? (color as GroupColor) : GROUP_COLORS[0];
}

export function GroupForm({ initial, showSuggestions = false, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>({
    name: initial?.name ?? '',
    emoji: initial?.emoji ?? '📍',
    color: toPaletteColor(initial?.color),
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const parsed = groupInputSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (e) {
      setError(toAppError(e).userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {showSuggestions && (
        <View style={styles.section}>
          <Text style={styles.label}>추천</Text>
          <View style={styles.wrap}>
            {GROUP_SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion.name}
                testID={`suggestion-${suggestion.name}`}
                accessibilityRole="button"
                onPress={() => setValues({ name: suggestion.name, emoji: suggestion.emoji, color: suggestion.color })}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              >
                <Text style={styles.suggestionText}>
                  {suggestion.emoji} {suggestion.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.emojiField}>
          <Text style={styles.label}>이모지</Text>
          <TextInput
            value={values.emoji}
            onChangeText={(emoji) => setValues((prev) => ({ ...prev, emoji }))}
            style={[styles.input, styles.emojiInput]}
            maxLength={8}
            accessibilityLabel="그룹 이모지"
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            value={values.name}
            onChangeText={(name) => setValues((prev) => ({ ...prev, name }))}
            placeholder="예: 맛집"
            placeholderTextColor={colors.inkMuted}
            maxLength={GROUP_NAME_MAX_LENGTH}
            style={styles.input}
            accessibilityLabel="그룹 이름"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>색</Text>
        <View style={styles.wrap}>
          {GROUP_COLORS.map((color) => (
            <Pressable
              key={color}
              testID={`color-${color}`}
              accessibilityRole="radio"
              accessibilityLabel={`색 ${color}`}
              accessibilityState={{ selected: values.color === color }}
              onPress={() => setValues((prev) => ({ ...prev, color }))}
              style={[styles.swatch, { backgroundColor: color }, values.color === color && styles.swatchSelected]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.preview, { borderColor: values.color }]}>
        <Text style={styles.previewText}>
          {values.emoji} {values.name || '그룹 이름'}
        </Text>
      </View>

      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button label={submitLabel} onPress={submit} isLoading={isSubmitting} testID="group-submit" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs + 2 },
  emojiField: { width: 72, gap: spacing.xs + 2 },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.inkMuted },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  emojiInput: { textAlign: 'center', fontSize: 22 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestion: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  suggestionText: { fontSize: fontSize.body, color: colors.ink },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchSelected: { borderWidth: 3, borderColor: colors.ink },
  preview: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  previewText: { fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  error: { color: colors.danger, textAlign: 'center' },
});
