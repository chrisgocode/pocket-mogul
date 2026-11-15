import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { selectCashCents } from '@/application/cashView';
import { selectCashFlow } from '@/application/cashFlowView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Icon } from '@/ui/Icons';
import { AppText } from '@/ui/Typography';
import { colors, radius, size, spacing } from '@/ui/tokens';

import { HudRank } from './HudRank';

export function GameHeader() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const format = useMoneyFormat();
  const cashCents = selectCashCents(snapshot, content);
  const flowCents = selectCashFlow(snapshot, content).netCents;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <HudRank />
        <View style={styles.pill} accessible accessibilityLabel={`Cash ${format.money(cashCents)}`}>
          <Icon name="coin" color={colors.gold} size={size.iconMedium} />
          <AppText variant="heading" numberOfLines={1}>
            {format.short(cashCents)}
          </AppText>
          <AppText variant="micro" style={flowCents < 0n ? styles.loss : styles.gain}>
            {format.shortRate(flowCents)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pill: {
    height: size.hudPill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gain: { color: colors.gain },
  loss: { color: colors.loss },
});
