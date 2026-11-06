import { StyleSheet, View } from 'react-native';

import type {
  AvailableBusinessUpgrade,
  BusinessUpgradeOption,
} from '@/application/businessDetailView';
import { formatRatePerMinute } from '@/domain/money';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { priceLabel, TRACK_EFFECTS, TRACK_NAMES } from './businessFormat';

export function BusinessUpgradeRow({
  upgrade,
  maxLevel,
  onReview,
}: {
  upgrade: BusinessUpgradeOption;
  maxLevel: number;
  onReview: (upgrade: AvailableBusinessUpgrade) => void;
}) {
  const track = TRACK_NAMES[upgrade.track];
  const title = `${track} ${upgrade.level}/${maxLevel}`;
  if (upgrade.status === 'max') {
    return <ListRow title={title} subtitle={TRACK_EFFECTS[upgrade.track]} value="Max level" />;
  }
  const benefit = `+${formatRatePerMinute(upgrade.benefitPerMinuteCents, 'full')}`;
  const label = priceLabel('Upgrade', upgrade);
  return (
    <View style={styles.upgrade}>
      <ListRow title={title} subtitle={TRACK_EFFECTS[upgrade.track]} value={benefit} detail="net" />
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
