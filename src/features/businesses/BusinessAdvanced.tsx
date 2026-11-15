import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Disclosure } from '@/ui/Disclosure';
import { Section } from '@/ui/Section';
import { DealsSection } from './DealsSection';
import { LockedDealsCard } from './LockedDealsCard';
import { SynergiesSection } from './SynergiesSection';
import type { BusinessAction } from './businessAction';
const REGIONAL_STAGE = 3;
export function BusinessAdvanced({
  detail,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
}) {
  return (
    <>
      <SynergiesSection detail={detail} />
      {detail.stage >= REGIONAL_STAGE ? (
        <DealsSection detail={detail} onReview={onReview} />
      ) : (
        <Disclosure title="Next unlocks">
          <Section title="Deals">
            <LockedDealsCard unlockStage={REGIONAL_STAGE} />
          </Section>
        </Disclosure>
      )}
    </>
  );
}
