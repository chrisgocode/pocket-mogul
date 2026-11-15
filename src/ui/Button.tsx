import { Pressable, StyleSheet } from 'react-native';

import { useAccent } from './Accent';
import { ButtonSurface } from './ButtonSurface';
import { Icon, type IconName } from './Icons';
import { useButtonPressedStyle } from './pressFeedback';
import { AppText } from './Typography';
import { colors, minimumTouchTarget, size as sizes, spacing } from './tokens';

type ButtonVariant = 'primary' | 'secondary';

const INK: Record<ButtonVariant, string> = {
  primary: colors.textOnAccent,
  secondary: colors.text,
};

type ButtonProps = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'regular' | 'compact';
  icon?: IconName;
  disabled?: boolean;
};

export function Button({
  label,
  accessibilityLabel = label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  disabled = false,
}: ButtonProps) {
  const accent = useAccent();
  const pressedStyle = useButtonPressedStyle();
  const primary = variant === 'primary';
  const ink = INK[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'compact' && styles.compact,
        primary ? { backgroundColor: accent } : styles.secondary,
        pressed && pressedStyle,
        disabled && styles.disabled,
      ]}
    >
      {primary && !disabled ? <ButtonSurface /> : null}
      {icon === undefined ? null : <Icon name={icon} color={ink} size={sizes.iconSmall} />}
      <AppText variant="heading" numberOfLines={1} style={{ color: ink }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const BUTTON_RADIUS = 13;
const COMPACT_HEIGHT = 36;

const styles = StyleSheet.create({
  button: {
    minHeight: minimumTouchTarget,
    borderRadius: BUTTON_RADIUS,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: sizes.buttonDepth,
    borderBottomColor: colors.buttonLowerEdge,
  },
  compact: {
    minHeight: COMPACT_HEIGHT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  secondary: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.4 },
});
