import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { ContractsCard } from './ContractsCard';
import { DeliveryCoachMark } from './DeliveryCoachMark';
import type { DeliveryActions } from './deliveryFormat';
import { LockedDeliveryCard } from './LockedDeliveryCard';
import { OffersCard } from './OffersCard';
import { ReputationCard } from './ReputationCard';
import { SortingHubCard } from './SortingHubCard';

export function DeliverySection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: DeliveryActions;
}) {
  const { delivery } = detail;
  if (delivery === undefined) return null;
  if (delivery.status === 'locked') {
    return (
      <LockedDeliveryCard
        unlockStage={delivery.unlockStage}
        vansPerDriver={delivery.vansPerDriver}
      />
    );
  }
  return (
    <Section
      id="mechanic"
      title="Contracts"
      note="Contracts go out first; missed parcels pay a penalty"
    >
      {delivery.coachMark === 'show' ? (
        <DeliveryCoachMark
          unlockStage={delivery.unlockStage}
          vansPerDriver={delivery.fleet.vansPerDriver}
          onDismiss={actions.dismissCoachMark}
        />
      ) : null}
      <ReputationCard reputation={delivery.reputation} fleet={delivery.fleet} />
      <OffersCard offers={delivery.offers} actions={actions} />
      <ContractsCard contracts={delivery.contracts} />
      <SortingHubCard hub={delivery.sortingHub} onReview={actions.installSortingHub} />
    </Section>
  );
}
