import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { BeansCard } from './BeansCard';
import { CoffeeKioskCoachMark } from './CoffeeKioskCoachMark';
import type { CoffeeKioskActions } from './coffeeKioskFormat';
import { LockedMechanicCard } from './LockedMechanicCard';
import { LOCKED_TEXT } from './lockedMechanicText';
import { OrderAheadCard } from './OrderAheadCard';
import { RushCard } from './RushCard';

export function CoffeeKioskSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: CoffeeKioskActions;
}) {
  const { coffeeKiosk } = detail;
  if (coffeeKiosk === undefined) return null;
  if (coffeeKiosk.status === 'locked') {
    return (
      <LockedMechanicCard text={LOCKED_TEXT.coffee_kiosk} unlockStage={coffeeKiosk.unlockStage} />
    );
  }
  return (
    <Section id="mechanic" title="Counter" note="The morning rush and your beans">
      {coffeeKiosk.coachMark === 'show' ? (
        <CoffeeKioskCoachMark
          unlockStage={coffeeKiosk.unlockStage}
          onDismiss={actions.dismissCoachMark}
        />
      ) : null}
      <RushCard
        rush={coffeeKiosk.rush}
        plan={coffeeKiosk.plan}
        plans={coffeeKiosk.plans}
        managerHired={detail.managerHired}
        onSelect={actions.setPlan}
      />
      <BeansCard
        grade={coffeeKiosk.grade}
        grades={coffeeKiosk.grades}
        onSelect={actions.setGrade}
      />
      <OrderAheadCard orderAhead={coffeeKiosk.orderAhead} onReview={actions.installOrderAhead} />
    </Section>
  );
}
