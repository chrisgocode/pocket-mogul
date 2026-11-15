import { StyleSheet, View } from 'react-native';

import type { AvailableWalletUpgrade, WalletUpgradeView } from '@/application/walletUpgradeView';
import { formatMoneyExact } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

import { WalletMaxed } from './WalletMaxed';

function spokenPrice(upgrade: AvailableWalletUpgrade): string {
  return upgrade.affordable
    ? `Upgrade · ${formatMoneyExact(upgrade.priceCents)}`
    : `Need ${formatMoneyExact(upgrade.shortfallCents)} more`;
}

export function WalletUpgradeControl({
  upgrade,
  highlighted,
  onReview,
}: {
  upgrade: WalletUpgradeView;
  highlighted: boolean;
  onReview: (upgrade: AvailableWalletUpgrade) => void;
}) {
  const format = useMoneyFormat();
  const current = formatMoneyExact(upgrade.payoutCents);
  if (upgrade.status === 'max')
    return <WalletMaxed level={upgrade.level} payoutCents={upgrade.payoutCents} />;
  const next = formatMoneyExact(upgrade.nextPayoutCents);
  return (
    <Card style={styles.dock} highlighted={highlighted}>
      <View style={styles.text}>
        <AppText variant="label" muted numberOfLines={1}>
          Wallet Lv {upgrade.level + 1}
        </AppText>
        <AppText variant="heading" numberOfLines={1}>
          +{format.short(upgrade.nextPayoutCents)} / tap
        </AppText>
      </View>
      <Button
        icon="upgrade"
        label={format.short(upgrade.priceCents)}
        accessibilityLabel={`Upgrade wallet, ${current} to ${next} per tap, ${spokenPrice(upgrade)}`}
        onPress={() => onReview(upgrade)}
        disabled={!upgrade.affordable}
      />
    </Card>
  );
}

const DOCK_RADIUS = 18;

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: DOCK_RADIUS,
  },
  text: { flexShrink: 1, gap: 2 },
});
