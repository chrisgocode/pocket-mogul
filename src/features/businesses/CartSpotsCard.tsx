import type { CartSpotView } from '@/application/foodCartView';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { CartSpotRow } from './CartSpotRow';

export function CartSpotsCard({
  spots,
  managerHired,
  onMove,
}: {
  spots: readonly CartSpotView[];
  managerHired: boolean;
  onMove: (spot: CartSpotView['spot']) => void;
}) {
  const note = managerHired
    ? 'Your manager parks at the busiest spot every morning'
    : 'Crowds change every day. Tap a spot to move the cart there';
  return (
    <Card>
      <AppText variant="heading">Today&apos;s spot</AppText>
      <AppText variant="caption" muted>
        {note}
      </AppText>
      {spots.map((spot) => (
        <CartSpotRow key={spot.spot} spot={spot} onMove={onMove} />
      ))}
    </Card>
  );
}
