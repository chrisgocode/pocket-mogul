import type { AvailablePickup, PickupOption } from '@/application/laundromatView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'Vans collect and return laundry, bringing more customers every day';

export function PickupCard({
  pickup,
  onReview,
}: {
  pickup: PickupOption;
  onReview: (pickup: AvailablePickup) => void;
}) {
  if (pickup.status === 'locked') {
    const value = `Unlocks at ${stageName(pickup.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Pickup and delivery" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (pickup.status === 'installed') {
    return (
      <Card>
        <ListRow title="Pickup and delivery" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Pickup and delivery" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add pickup and delivery', pickup)}
        onPress={() => onReview(pickup)}
        disabled={!pickup.affordable}
      />
    </Card>
  );
}
