import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { CartMenuCard } from './CartMenuCard';
import { CartSpotsCard } from './CartSpotsCard';
import { FoodCartCoachMark } from './FoodCartCoachMark';
import type { FoodCartActions } from './foodCartFormat';
import { LockedFoodCartCard } from './LockedFoodCartCard';
import { SecondWindowCard } from './SecondWindowCard';

export function FoodCartSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: FoodCartActions;
}) {
  const { foodCart } = detail;
  if (foodCart === undefined) return null;
  if (foodCart.status === 'locked')
    return <LockedFoodCartCard unlockStage={foodCart.unlockStage} />;
  return (
    <Section id="mechanic" title="Street" note="Today's spot and menu">
      {foodCart.coachMark === 'show' ? (
        <FoodCartCoachMark
          unlockStage={foodCart.unlockStage}
          onDismiss={actions.dismissCoachMark}
        />
      ) : null}
      <CartSpotsCard
        spots={foodCart.spots}
        managerHired={detail.managerHired}
        onMove={actions.setSpot}
      />
      <CartMenuCard menu={foodCart.menu} actions={actions} />
      <SecondWindowCard
        secondWindow={foodCart.secondWindow}
        onReview={actions.installSecondWindow}
      />
    </Section>
  );
}
