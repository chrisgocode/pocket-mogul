import { StyleSheet, View } from 'react-native';

import type {
  AvailablePropertyUpgrade,
  PropertyUpgradeOption,
} from '@/application/propertyDetailView';
import { formatRatePerMinute } from '@/domain/money';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { TRACK_EFFECTS, TRACK_NAMES } from './propertyFormat';

export function PropertyUpgradeRow({
  upgrade,
  onReview,
}: {
  upgrade: PropertyUpgradeOption;
  onReview: (upgrade: AvailablePropertyUpgrade) => void;
}) {
  const track = TRACK_NAMES[upgrade.track];
  if (upgrade.status === 'unavailable') {
    return <ListRow title={track} subtitle="Not available on this property" dimmed />;
  }
  const title = `${track} ${upgrade.level}/${upgrade.maxLevel}`;
  const effect = TRACK_EFFECTS[upgrade.track];
  if (upgrade.status === 'max')
    return <ListRow title={title} subtitle={effect} value="Max level" />;
  const benefit = `+${formatRatePerMinute(upgrade.rentedBenefitPerMinuteCents, 'full')}`;
  const label = priceLabel('Upgrade', upgrade);
  return (
    <View style={styles.upgrade}>
      <ListRow title={title} subtitle={effect} value={benefit} detail="net when rented" />
      <Button
        label={label}
        accessibilityLabel={`Upgrade ${track}, ${benefit}, ${label}`}
        onPress={() => onReview(upgrade)}
        disabled={!upgrade.affordable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  upgrade: { gap: spacing.sm },
});
