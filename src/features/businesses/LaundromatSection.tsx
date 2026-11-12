import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { LaundromatCoachMark } from './LaundromatCoachMark';
import type { LaundromatActions } from './laundromatFormat';
import { LockedLaundromatCard } from './LockedLaundromatCard';
import { MachineMixCard } from './MachineMixCard';
import { PickupCard } from './PickupCard';
import { ServiceWashCard } from './ServiceWashCard';

export function LaundromatSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: LaundromatActions;
}) {
  const { laundromat } = detail;
  if (laundromat === undefined) return null;
  if (laundromat.status === 'locked') {
    return <LockedLaundromatCard unlockStage={laundromat.unlockStage} />;
  }
  return (
    <Section id="mechanic" title="Floor" note="Your machines and service washes">
      {laundromat.coachMark === 'show' ? (
        <LaundromatCoachMark
          unlockStage={laundromat.unlockStage}
          onDismiss={actions.dismissCoachMark}
        />
      ) : null}
      <MachineMixCard
        jumbo={laundromat.jumbo}
        shares={laundromat.jumboShares}
        managerHired={detail.managerHired}
        onSelect={actions.setJumboShare}
      />
      <ServiceWashCard service={laundromat.service} onSelect={actions.setServiceLevel} />
      <PickupCard pickup={laundromat.pickup} onReview={actions.installPickup} />
    </Section>
  );
}
