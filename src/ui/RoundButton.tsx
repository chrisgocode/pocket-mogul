import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, type BadgeTone } from './Badge';
import { Icon, type IconName } from './Icons';
import { usePressedStyle } from './pressFeedback';
import { AppText } from './Typography';
import { colors, radius, size, spacing } from './tokens';

export type RoundButtonBadge = { tone: BadgeTone; text?: string; icon?: IconName };

export function RoundButton({
  icon,
  label,
  accessibilityLabel = label,
  badge,
  dimmed = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  accessibilityLabel?: string;
  badge?: RoundButtonBadge | undefined;
  dimmed?: boolean;
  onPress: () => void;
}) {
  const pressedStyle = usePressedStyle();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, dimmed && styles.dimmed, pressed && pressedStyle]}
    >
      <View style={styles.disc}>
        <Icon name={icon} color={colors.text} size={size.iconMedium} />
        {badge === undefined ? null : (
          <View style={styles.badge}>
            <Badge tone={badge.tone} text={badge.text} icon={badge.icon} />
          </View>
        )}
      </View>
      <AppText variant="micro" muted numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const BADGE_OFFSET = -4;

const styles = StyleSheet.create({
  button: { width: size.railWidth, alignItems: 'center', gap: spacing.xs },
  dimmed: { opacity: 0.5 },
  disc: {
    width: size.railButton,
    height: size.railButton,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 3,
  },
  badge: { position: 'absolute', top: BADGE_OFFSET, right: BADGE_OFFSET },
});
