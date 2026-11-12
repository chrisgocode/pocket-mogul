import type { CartSpotView } from '@/application/foodCartView';
import { ListRow } from '@/ui/ListRow';

import { CROWD_NAMES, SPOT_NAMES } from './foodCartFormat';

function spotNote(spot: CartSpotView): string {
  const [tomorrow] = spot.forecast;
  const today = `${CROWD_NAMES[spot.crowd]} today`;
  return tomorrow === undefined ? today : `${today} · ${CROWD_NAMES[tomorrow]} tomorrow`;
}

export function CartSpotRow({
  spot,
  onMove,
}: {
  spot: CartSpotView;
  onMove: (spot: CartSpotView['spot']) => void;
}) {
  const name = SPOT_NAMES[spot.spot];
  const customers = `${spot.customersPercent}% customers`;
  if (spot.parked) {
    return (
      <ListRow title={name} subtitle={spotNote(spot)} value={customers} detail="Parked here" />
    );
  }
  return (
    <ListRow
      title={name}
      subtitle={spotNote(spot)}
      value={customers}
      detail="Move here"
      accessibilityLabel={`Move to ${name}, ${spotNote(spot)}, ${customers}`}
      onPress={() => onMove(spot.spot)}
    />
  );
}
