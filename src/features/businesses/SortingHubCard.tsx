import type { AvailableSortingHub, SortingHubOption } from '@/application/deliveryView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const effect = (hub: SortingHubOption) =>
  `Sorts parcels centrally for ${hub.capacityPercent}% more capacity`;

export function SortingHubCard({
  hub,
  onReview,
}: {
  hub: SortingHubOption;
  onReview: (hub: AvailableSortingHub) => void;
}) {
  if (hub.status === 'locked') {
    const value = `Unlocks at ${stageName(hub.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Sorting hub" subtitle={effect(hub)} value={value} dimmed />
      </Card>
    );
  }
  if (hub.status === 'installed') {
    return (
      <Card>
        <ListRow title="Sorting hub" subtitle={effect(hub)} value="Built" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Sorting hub" subtitle={effect(hub)} />
      <Button
        label={priceLabel('Build', hub)}
        onPress={() => onReview(hub)}
        disabled={!hub.affordable}
      />
    </Card>
  );
}
