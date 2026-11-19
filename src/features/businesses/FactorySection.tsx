import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { AutomationCard } from './AutomationCard';
import { BulkOrdersCard } from './BulkOrdersCard';
import { FactoryCoachMark } from './FactoryCoachMark';
import type { FactoryActions } from './factoryFormat';
import { LockedMechanicCard } from './LockedMechanicCard';
import { LOCKED_TEXT } from './lockedMechanicText';
import { ProductLineCard } from './ProductLineCard';

export function FactorySection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: FactoryActions;
}) {
  const { factory } = detail;
  if (factory === undefined) return null;
  if (factory.status === 'locked')
    return <LockedMechanicCard text={LOCKED_TEXT.factory} unlockStage={factory.unlockStage} />;
  return (
    <Section id="mechanic" title="Factory floor" note="Your product and bulk orders">
      {factory.coachMark === 'show' ? (
        <FactoryCoachMark unlockStage={factory.unlockStage} onDismiss={actions.dismissCoachMark} />
      ) : null}
      <ProductLineCard
        product={factory.product}
        retoolDaysLeft={factory.retoolDaysLeft}
        products={factory.products}
        onSelect={actions.setProduct}
      />
      <BulkOrdersCard bulk={factory.bulk} onAnswer={actions.answerBulkOffer} />
      <AutomationCard automation={factory.automation} onReview={actions.installAutomation} />
    </Section>
  );
}
