import { Pressable, StyleSheet } from 'react-native';

import { useAccent } from './Accent';
import { ButtonSurface } from './ButtonSurface';
import { useButtonPressedStyle } from './pressFeedback';
import { AppText } from './Typography';
import { colors, minimumTouchTarget, radius, spacing } from './tokens';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

export function Button({
  label,
  accessibilityLabel = label,
  onPress,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  const accent = useAccent();
  const pressedStyle = useButtonPressedStyle();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'primary' ? { backgroundColor: accent } : styles.secondary,
        pressed && pressedStyle,
        disabled && styles.disabled,
      ]}
    >
      {variant === 'primary' && !disabled ? <ButtonSurface /> : null}
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.transparent,
  },
  primary: {
    borderTopColor: colors.buttonTopEdge,
    borderBottomColor: colors.buttonLowerEdge,
    borderBottomWidth: 3,
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border },
  disabled: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
  onAccent: { color: colors.textOnAccent },
  onSurface: { color: colors.text },
});
