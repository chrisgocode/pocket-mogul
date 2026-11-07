import { StyleSheet, View } from 'react-native';

import { useGameSnapshot } from '@/features/game/GameContext';
import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

export function AdBreakCard() {
  const { automaticAd } = useGameSnapshot();
  if (automaticAd !== 'adBreak') return null;
  return (
    <View style={styles.cover} testID="ad-break-card" accessibilityViewIsModal>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <AppText variant="title">Ad break</AppText>
        <AppText muted>A short ad is coming up.</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.scrim,
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
