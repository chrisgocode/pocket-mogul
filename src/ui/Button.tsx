import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './Typography';
import { colors, feedback, minimumTouchTarget, radius, spacing } from './tokens';

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceMuted },
  pressed: { transform: [{ scale: feedback.pressedScale }] },
  disabled: { backgroundColor: colors.locked },
  onAccent: { color: colors.textOnAccent },
  onSurface: { color: colors.text },
});
