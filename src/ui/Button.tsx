import { Pressable, StyleSheet } from 'react-native';

import { usePressedStyle } from './pressFeedback';
import { AppText } from './Typography';
import { buttonEdgeWidth, colors, glow, minimumTouchTarget, radius, spacing } from './tokens';

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
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && pressedStyle,
        disabled && styles.disabled,
      ]}
    >
      <AppText variant="heading" style={labelStyleFor(variant, disabled)}>
        {label}
      </AppText>
    </Pressable>
  );
}

function labelStyleFor(variant: ButtonVariant, disabled: boolean) {
  if (disabled) return styles.onDisabled;
  return variant === 'primary' ? styles.onAccent : styles.onSurface;
}

const styles = StyleSheet.create({
  button: {
    minHeight: minimumTouchTarget,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: buttonEdgeWidth,
  },
  primary: {
    backgroundColor: colors.accent,
    borderBottomColor: colors.accentDeep,
    boxShadow: glow.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderBottomColor: colors.border,
  },
  disabled: {
    backgroundColor: colors.surfaceMuted,
    borderBottomColor: colors.surfaceMuted,
    boxShadow: 'none',
  },
  onAccent: { color: colors.textOnAccent },
  onSurface: { color: colors.text },
  onDisabled: { color: colors.locked },
});
