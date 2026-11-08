import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { selectPortfolio } from '@/application/portfolioView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatPair } from '@/ui/StatPair';
import { AppText } from '@/ui/Typography';
import { colors, minimumTouchTarget, spacing } from '@/ui/tokens';
export function HomeOverview() {
  const view = selectPortfolio(useGameSnapshot(), getContent());
  const format = useMoneyFormat();
  const business = view.income.find((line) => line.source === 'Businesses')?.rate;
  const rent = view.income.find((line) => line.source === 'Rent')?.rate;
  return (
    <View style={styles.content}>
      <Link href="/portfolio" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Net worth, open Profile"
          style={styles.worth}
        >
          <AppText variant="caption" muted>
            Net worth ↗
          </AppText>
          <AppText variant="display">{format.money(view.worth.netWorthCents)}</AppText>
        </Pressable>
      </Link>
      <StatPair
        left={{
          label: 'Business payouts',
          value: business === undefined ? '—' : format.rate(business.cents),
        }}
        right={{ label: 'Net rent', value: rent === undefined ? '—' : format.rate(rent.cents) }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  worth: { minHeight: minimumTouchTarget, gap: spacing.sm, borderBottomColor: colors.border },
});
