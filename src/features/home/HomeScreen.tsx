import { StyleSheet, View } from 'react-native';

import { getContent } from '@/content';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

export function HomeScreen() {
  const { tap } = getContent().economy;
  return (
    <Screen>
      <Card>
        <AppText variant="caption" muted>
          Cash
        </AppText>
        <AppText variant="display" accessibilityLabel={`Cash ${formatMoneyExact(moneyCents(0))}`}>
          {formatMoneyExact(moneyCents(0))}
        </AppText>
        <AppText muted>{formatMoneyExact(tap.baseCents)} per tap · $0.00/min passive</AppText>
      </Card>
      <View style={styles.tapCard} accessibilityLabel="Tap card, not active yet">
        <AppText variant="title" style={styles.tapText}>
          Tap card
        </AppText>
        <AppText style={styles.tapText}>Level 0</AppText>
      </View>
      <EmptyState
        title="Tapping is on its way"
        message="This build sets up the app. Tapping, Wallet upgrades and the Tap Boost arrive with the game engine."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tapCard: {
    aspectRatio: 1.6,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    padding: spacing.xl,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  tapText: { color: colors.textOnAccent },
});
