import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { toAppError } from '@/lib/appError';
import { Button } from '@/ui/Button';
import { colors, fontSize, radius, spacing } from '@/ui/theme';

import { MEMO_BODY_MAX_LENGTH, memoInputSchema, type MemoInput } from './memoSchema';

type FormValues = { title: string; address: string; body: string };
type FieldErrors = Partial<Record<keyof FormValues, string>>;

type Props = {
  initial: { title?: string; address?: string | null; body?: string };
  coord: { lat: number; lng: number };
  naverPlaceId?: string | null;
  submitLabel: string;
  onSubmit: (values: MemoInput) => Promise<void>;
};

export function MemoForm({ initial, coord, naverPlaceId = null, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>({
    title: initial.title ?? '',
    address: initial.address ?? '',
    body: initial.body ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key: keyof FormValues) => (text: string) => setValues((prev) => ({ ...prev, [key]: text }));

  const submit = async () => {
    const parsed = memoInputSchema.safeParse({ ...values, address: values.address, lat: coord.lat, lng: coord.lng, naverPlaceId });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (key in values && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (e) {
      setSubmitError(toAppError(e).userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="장소 이름" error={fieldErrors.title}>
          <TextInput value={values.title} onChangeText={setField('title')} placeholder="장소 이름" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="장소 이름" />
        </Field>
        <Field label="주소 (선택)" error={fieldErrors.address}>
          <TextInput value={values.address} onChangeText={setField('address')} placeholder="주소" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="주소" />
        </Field>
        <Field label="메모" error={fieldErrors.body} trailing={`${values.body.length}/${MEMO_BODY_MAX_LENGTH}`}>
          <TextInput
            value={values.body}
            onChangeText={setField('body')}
            placeholder="화장실 비번, 추천 메뉴, 기억하고 싶은 것…"
            placeholderTextColor={colors.inkMuted}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.bodyInput]}
            accessibilityLabel="메모"
          />
        </Field>
        <Text style={styles.coord}>
          📍 {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
        </Text>
        {submitError && (
          <Text accessibilityRole="alert" style={styles.submitError}>
            {submitError}
          </Text>
        )}
        <Button label={submitLabel} onPress={submit} isLoading={isSubmitting} testID="memo-submit" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, trailing, children }: { label: string; error?: string; trailing?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {trailing && <Text style={styles.trailing}>{trailing}</Text>}
      </View>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.xs + 2 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.inkMuted },
  trailing: { fontSize: fontSize.caption, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  bodyInput: { minHeight: 180 },
  fieldError: { color: colors.danger, fontSize: fontSize.caption + 1 },
  coord: { color: colors.inkMuted, fontSize: fontSize.caption, fontVariant: ['tabular-nums'] },
  submitError: { color: colors.danger, textAlign: 'center' },
});
