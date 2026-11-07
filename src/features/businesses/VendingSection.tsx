import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import type { VendingView } from '@/application/vendingView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Section } from '@/ui/Section';

import { CardReaderCard } from './CardReaderCard';
import { LockedVendingCard } from './LockedVendingCard';
import type { VendingActions } from './vendingFormat';
import { VendingCoachMark } from './VendingCoachMark';
import { VendingSpotCard } from './VendingSpotCard';

type ActiveVending = Extract<VendingView, { status: 'active' }>;

function locationsNote(vending: ActiveVending): string {
  if (vending.restockers > 0) return 'Your restocking staff refill every location each day';
  return 'Restock by hand, or hire restocking staff to refill every location each day';
}

function restockAllLabel(vending: ActiveVending): string {
  if (vending.restockAll.priceCents === 0n) return 'Every location is stocked';
  return priceLabel('Restock all', vending.restockAll);
}

export function VendingSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: VendingActions;
}) {
  const { vending } = detail;
  if (vending === undefined) return null;
  if (vending.status === 'locked') return <LockedVendingCard unlockStage={vending.unlockStage} />;
  const canRestockAll = vending.restockAll.priceCents > 0n && vending.restockAll.affordable;
  return (
    <Section title="Locations" note={locationsNote(vending)}>
      {vending.coachMark === 'show' ? (
        <VendingCoachMark onDismiss={actions.dismissCoachMark} />
      ) : null}
      <Button
        label={restockAllLabel(vending)}
        onPress={() => actions.restock('all')}
        disabled={!canRestockAll}
      />
      {vending.spots.map((spot) => (
        <VendingSpotCard
          key={spot.location}
          spot={spot}
          managerHired={detail.managerHired}
          actions={actions}
        />
      ))}
      <CardReaderCard readers={vending.cardReaders} onReview={actions.installCardReaders} />
    </Section>
  );
}
