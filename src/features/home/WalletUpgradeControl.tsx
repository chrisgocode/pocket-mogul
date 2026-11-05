import { StyleSheet, View } from 'react-native';

import type { WalletUpgradeView } from '@/application/walletUpgradeView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

function upgradeLabel(upgrade: Extract<WalletUpgradeView, { status: 'available' }>): string {
  const price = formatMoneyExact(upgrade.priceCents);
  return upgrade.shortfallCents > 0n
    ? `Need ${formatMoneyExact(upgrade.shortfallCents)} more`
    : `Upgrade · ${price}`;
}

export function WalletUpgradeControl({
  upgrade,
  onPress,
}: {
  upgrade: WalletUpgradeView;
  onPress: () => void;
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
  return (
    <Card>
      <View style={styles.heading}>
        <AppText variant="heading">Wallet level {upgrade.level}</AppText>
        <AppText variant="number">{formatMoneyExact(upgrade.priceCents)}</AppText>
      </View>
      <AppText muted>
        {current} → {next} per tap
      </AppText>
      <Button
        label={upgradeLabel(upgrade)}
        accessibilityLabel={`Upgrade wallet, ${current} to ${next} per tap, ${upgradeLabel(upgrade)}`}
        onPress={onPress}
        disabled={upgrade.shortfallCents > 0n}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
