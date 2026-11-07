import type { VendingSpotView } from '@/application/vendingView';
import { STOCK_MIXES } from '@/domain/business/vendingRules';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { ListRow } from '@/ui/ListRow';

import { LOCATION_NAMES, MIX_NAMES, type VendingActions } from './vendingFormat';
import { VendingSpotActions } from './VendingSpotActions';

function stockText(spot: VendingSpotView): string {
  if (spot.machines === 0) return 'No machines';
  if (spot.stock === 0) return 'Out of stock';
  return `Stock ${spot.stock}/${spot.fullStock}`;
}

const machineCount = (spot: VendingSpotView) =>
  `${spot.machines}/${spot.slots} ${spot.slots === 1 ? 'machine' : 'machines'}`;

function mixNote(spot: VendingSpotView, managerHired: boolean): string {
  if (managerHired) return 'Your manager picks the best mix at the start of each day';
  return `Match ${spot.matchPercent}% · Best here: ${MIX_NAMES[spot.bestMix]}`;
}

export function VendingSpotCard({
  spot,
  managerHired,
  actions,
}: {
  spot: VendingSpotView;
  managerHired: boolean;
  actions: VendingActions;
}) {
  const name = LOCATION_NAMES[spot.location];
  const choices = STOCK_MIXES.map((mix) => ({
    value: mix,
    label: `${MIX_NAMES[mix]}${mix === spot.bestMix ? ' ★' : ''}`,
  }));
  const outOfStock = spot.machines > 0 && spot.stock === 0;
  return (
    <Card highlighted={outOfStock}>
      <ListRow
        title={name}
        subtitle={`${machineCount(spot)} · Traffic ${spot.trafficPercent}%`}
        value={stockText(spot)}
      />
      {spot.machines > 0 ? (
        <ChoiceRow
          title={`${name} mix`}
          note={mixNote(spot, managerHired)}
          choices={choices}
          selected={spot.mix}
          onSelect={(mix) => actions.setMix({ location: spot.location, mix })}
        />
      ) : null}
      <VendingSpotActions spot={spot} actions={actions} />
    </Card>
  );
}
