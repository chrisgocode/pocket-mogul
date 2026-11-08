import { StyleSheet, View } from 'react-native';
import { selectBusinessWorth } from '@/application/businessWorthView';
import { selectBusinessIncomePerMinuteCents } from '@/application/cashView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { AppText } from '@/ui/Typography';
import { sectionColors, spacing } from '@/ui/tokens';
export function BusinessSummary() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const format = useMoneyFormat();
  return (
    <View style={styles.summary}>
      <AppText variant="caption" muted>
        Business net worth
      </AppText>
      <AppText variant="display" style={styles.value}>
        {format.money(selectBusinessWorth(snapshot, content))}
      </AppText>
      <AppText
        variant="caption"
        muted
      >{`${snapshot.state.businesses.length} owned · ${format.rate(selectBusinessIncomePerMinuteCents(snapshot, content))} to cash`}</AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  summary: { gap: spacing.sm },
  value: { color: sectionColors.businesses },
});
