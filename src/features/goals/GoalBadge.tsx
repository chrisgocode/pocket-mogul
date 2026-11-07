import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/Typography';
import { colors, radius } from '@/ui/tokens';

const BADGE_SIZE = 36;

export function GoalBadge({ reached }: { reached: boolean }) {
  return (
    <View
      style={[styles.badge, reached ? styles.reached : styles.open]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="heading" style={reached ? styles.onReached : styles.onOpen}>
        {reached ? '★' : '☆'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reached: { backgroundColor: colors.accent },
  open: { backgroundColor: colors.surfaceMuted },
  onReached: { color: colors.textOnAccent },
  onOpen: { color: colors.locked },
});
