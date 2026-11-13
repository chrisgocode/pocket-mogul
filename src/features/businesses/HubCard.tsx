import type { AvailableHub, HubOption } from '@/application/airlineView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'Connections through your own hub, so every plane flies more seats a day';

export function HubCard({
  hub,
  onReview,
}: {
  hub: HubOption;
  onReview: (hub: AvailableHub) => void;
}) {
  if (hub.status === 'locked') {
    const value = `Unlocks at ${stageName(hub.unlockStage)}`;
    return (
      <Card>
        <ListRow title="International hub" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (hub.status === 'installed') {
    return (
      <Card>
        <ListRow title="International hub" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="International hub" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add an international hub', hub)}
        onPress={() => onReview(hub)}
        disabled={!hub.affordable}
      />
    </Card>
  );
}
