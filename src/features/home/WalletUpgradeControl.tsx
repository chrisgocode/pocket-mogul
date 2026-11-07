import { StyleSheet, View } from 'react-native';

import type { AvailableWalletUpgrade, WalletUpgradeView } from '@/application/walletUpgradeView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

function upgradeLabel(upgrade: AvailableWalletUpgrade): string {
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
  const current = formatMoneyExact(upgrade.payoutCents);
  if (upgrade.status === 'max') {
    return (
      <Card>
        <AppText variant="heading">Wallet level {upgrade.level}</AppText>
        <AppText muted>{current} per tap</AppText>
        <AppText variant="heading">Max level</AppText>
      </Card>
    );
  }
  const next = formatMoneyExact(upgrade.nextPayoutCents);
  const label = upgradeLabel(upgrade);
  return (
    <Card highlighted={highlighted}>
      <View style={styles.heading}>
        <AppText variant="heading">Wallet level {upgrade.level}</AppText>
        <AppText variant="number">{formatMoneyExact(upgrade.priceCents)}</AppText>
      </View>
      <AppText muted>
        {current} → {next} per tap
      </AppText>
      <Button
        label={label}
        accessibilityLabel={`Upgrade wallet, ${current} to ${next} per tap, ${label}`}
        onPress={() => onReview(upgrade)}
        disabled={!upgrade.affordable}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
