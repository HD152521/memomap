import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fontSize, radius, spacing } from './theme';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', isLoading = false, disabled = false, style, testID }: Props) {
  const isDisabled = disabled || isLoading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles[`${variant}Pressed`], isDisabled && styles.disabled, style]}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.ink : colors.surface} />
      ) : (
        <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  primaryPressed: { backgroundColor: colors.accentPressed, transform: [{ scale: 0.98 }] },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  secondaryPressed: { backgroundColor: colors.paper, transform: [{ scale: 0.98 }] },
  danger: { backgroundColor: colors.danger },
  dangerPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  label: { color: colors.surface, fontSize: fontSize.body, fontWeight: '700' },
  labelSecondary: { color: colors.ink },
});
