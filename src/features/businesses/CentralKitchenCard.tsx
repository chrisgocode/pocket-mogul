import type { AvailableCentralKitchen, CentralKitchenOption } from '@/application/bakeryView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'One kitchen preps for every oven, so each bakes more orders a day';

export function CentralKitchenCard({
  centralKitchen,
  onReview,
}: {
  centralKitchen: CentralKitchenOption;
  onReview: (centralKitchen: AvailableCentralKitchen) => void;
}) {
  if (centralKitchen.status === 'locked') {
    const value = `Unlocks at ${stageName(centralKitchen.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Central kitchen" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (centralKitchen.status === 'installed') {
    return (
      <Card>
        <ListRow title="Central kitchen" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Central kitchen" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add a central kitchen', centralKitchen)}
        onPress={() => onReview(centralKitchen)}
        disabled={!centralKitchen.affordable}
      />
    </Card>
  );
}
