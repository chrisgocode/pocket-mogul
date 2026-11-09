import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectCashCents } from '@/application/cashView';
import { selectCashFlow } from '@/application/cashFlowView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { AppText } from '@/ui/Typography';
import { colors, spacing } from '@/ui/tokens';
export function GameHeader() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const format = useMoneyFormat();
  const cash = format.money(selectCashCents(snapshot, content));
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View>
          <AppText variant="caption" muted>
            CASH
          </AppText>
          <AppText variant="display" accessibilityLabel={`Cash ${cash}`}>
            {cash}
          </AppText>
        </View>
        <View style={styles.flow}>
          <AppText variant="caption" style={styles.rate}>
            {format.rate(selectCashFlow(snapshot, content).netCents)}
          </AppText>
          <AppText variant="caption" muted>
            Cash flow
          </AppText>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background },
  row: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  flow: { alignItems: 'flex-end', flexShrink: 1 },
  rate: { color: colors.gain },
});
