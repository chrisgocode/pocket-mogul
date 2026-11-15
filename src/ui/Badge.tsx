import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icons';
import { AppText } from './Typography';
import { colors, radius, size } from './tokens';

export type BadgeTone = 'alert' | 'gain' | 'gold';

const TONE_COLORS: Record<BadgeTone, string> = {
  alert: colors.loss,
  gain: colors.gain,
  gold: colors.highlight,
};

const BADGE_ICON_SIZE = 12;
const BADGE_ICON_STROKE = 3;

export function Badge({
  tone,
  text,
  icon,
}: {
  tone: BadgeTone;
  text?: string | undefined;
  icon?: IconName | undefined;
}) {
  return (
    <View
      style={[styles.badge, { backgroundColor: TONE_COLORS[tone] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {icon === undefined ? null : (
        <Icon
          name={icon}
          color={colors.textOnAccent}
          size={BADGE_ICON_SIZE}
          strokeWidth={BADGE_ICON_STROKE}
        />
      )}
      {text === undefined ? null : (
        <AppText variant="micro" style={styles.text}>
          {text}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: size.badge,
    height: size.badge,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  text: { color: colors.textOnAccent },
});
