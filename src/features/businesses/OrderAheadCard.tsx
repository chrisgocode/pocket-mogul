import type { AvailableOrderAhead, OrderAheadOption } from '@/application/coffeeKioskView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'Customers order from their phones, so every kiosk serves more cups in the rush';

export function OrderAheadCard({
  orderAhead,
  onReview,
}: {
  orderAhead: OrderAheadOption;
  onReview: (orderAhead: AvailableOrderAhead) => void;
}) {
  if (orderAhead.status === 'locked') {
    const value = `Unlocks at ${stageName(orderAhead.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Order-ahead" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (orderAhead.status === 'installed') {
    return (
      <Card>
        <ListRow title="Order-ahead" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Order-ahead" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add order-ahead', orderAhead)}
        onPress={() => onReview(orderAhead)}
        disabled={!orderAhead.affordable}
      />
    </Card>
  );
}
