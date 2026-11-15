import type {
  AvailablePropertyUpgrade,
  PropertyUpgradeOption,
} from '@/application/propertyDetailView';
import { formatRatePerMinute } from '@/domain/money';
import { priceLabel } from '@/features/game/priceFormat';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { ActionRow } from '@/ui/ActionRow';
import { ListRow } from '@/ui/ListRow';

import { TRACK_EFFECTS, TRACK_NAMES } from './propertyFormat';

export function PropertyUpgradeRow({
  upgrade,
  onReview,
}: {
  upgrade: PropertyUpgradeOption;
  onReview: (upgrade: AvailablePropertyUpgrade) => void;
}) {
  const format = useMoneyFormat();
  const track = TRACK_NAMES[upgrade.track];
  if (upgrade.status === 'unavailable') {
    return <ListRow title={track} subtitle="Not available on this property" dimmed />;
  }
  const title = `${track} ${upgrade.level}/${upgrade.maxLevel}`;
  const effect = TRACK_EFFECTS[upgrade.track];
  if (upgrade.status === 'max')
    return <ListRow title={title} subtitle={effect} value="Max level" />;
  const benefit = `+${formatRatePerMinute(upgrade.rentedBenefitPerMinuteCents, 'full')}`;
  return (
    <ActionRow
      title={title}
      subtitle={effect}
      benefit={`${benefit} net when rented`}
      accessibilityLabel={`${title}, ${effect}, ${benefit}, net when rented`}
      action={{
        label: format.short(upgrade.priceCents),
        accessibilityLabel: `Upgrade ${track}, ${benefit}, ${priceLabel('Upgrade', upgrade)}`,
        disabled: !upgrade.affordable,
        onPress: () => onReview(upgrade),
      }}
    />
  );
}
