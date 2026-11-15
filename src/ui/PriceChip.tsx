import { StyleSheet, View } from 'react-native';

import { useAccent } from './Accent';
import { Icon, type IconName } from './Icons';
import { AppText } from './Typography';
import { colors, radius, size, spacing } from './tokens';

export function PriceChip({
  label,
  icon,
  tone = 'muted',
  accessibilityLabel,
}: {
  label: string;
  accessibilityLabel?: string;
  icon?: IconName | undefined;
  tone?: 'accent' | 'muted';
}) {
  const accent = useAccent();
  const filled = tone === 'accent';
  const ink = filled ? colors.textOnAccent : colors.textMuted;
  return (
    <View
      style={[styles.chip, filled && { backgroundColor: accent }]}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {icon === undefined ? null : <Icon name={icon} color={ink} size={size.iconSmall} />}
      <AppText variant="micro" numberOfLines={1} style={{ color: ink }}>
        {label}
      </AppText>
    </View>
  );
}

const CHIP_HEIGHT = 24;

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
});
