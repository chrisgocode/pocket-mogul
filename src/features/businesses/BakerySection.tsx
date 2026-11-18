import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { BakeryCoachMark } from './BakeryCoachMark';
import type { BakeryActions } from './bakeryFormat';
import { CentralKitchenCard } from './CentralKitchenCard';
import { LockedMechanicCard } from './LockedMechanicCard';
import { LOCKED_TEXT } from './lockedMechanicText';
import { OvenScheduleCard } from './OvenScheduleCard';
import { WholesaleCard } from './WholesaleCard';

export function BakerySection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: BakeryActions;
}) {
  const { bakery } = detail;
  if (bakery === undefined) return null;
  if (bakery.status === 'locked')
    return <LockedMechanicCard text={LOCKED_TEXT.bakery} unlockStage={bakery.unlockStage} />;
  return (
    <Section id="mechanic" title="Ovens" note="Your bake level and wholesale orders">
      {bakery.coachMark === 'show' ? (
        <BakeryCoachMark unlockStage={bakery.unlockStage} onDismiss={actions.dismissCoachMark} />
      ) : null}
      <OvenScheduleCard
        bakePercent={bakery.bakePercent}
        levels={bakery.bakeLevels}
        shelf={bakery.shelf}
        managerHired={detail.managerHired}
        onSelect={actions.setBakeLevel}
      />
      <WholesaleCard
        orders={bakery.orders}
        maxOrders={bakery.maxOrders}
        offer={bakery.offer}
        onAnswer={actions.answerOffer}
      />
      <CentralKitchenCard
        centralKitchen={bakery.centralKitchen}
        onReview={actions.installCentralKitchen}
      />
    </Section>
  );
}
