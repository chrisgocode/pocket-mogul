import { Pressable, StyleSheet } from 'react-native';

import { useAccent } from './Accent';
import { usePressedStyle } from './pressFeedback';
import { AppText } from './Typography';
import { colors, minimumTouchTarget, radius, spacing } from './tokens';

type ButtonVariant = 'primary' | 'secondary';

export function Button({
  label,
  accessibilityLabel = label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const accent = useAccent();
  const pressedStyle = usePressedStyle();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? { backgroundColor: accent } : styles.secondary,
        pressed && pressedStyle,
        disabled && styles.disabled,
      ]}
    >
      <AppText variant="heading" style={variant === 'primary' ? styles.onAccent : styles.onSurface}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minimumTouchTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.4 },
  onAccent: { color: colors.textOnAccent },
  onSurface: { color: colors.text },
});
