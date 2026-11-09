import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Disclosure } from '@/ui/Disclosure';
import { Section } from '@/ui/Section';
import { DealsSection } from './DealsSection';
import { LockedDealsCard } from './LockedDealsCard';
import { RisksSection } from './RisksSection';
import type { InsuranceChange } from './InsuranceButton';
import type { BusinessAction } from './businessAction';
const REGIONAL_STAGE = 3;
export function BusinessAdvanced({
  detail,
  onInsurance,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  onInsurance: (change: InsuranceChange) => void;
  onReview: (action: BusinessAction) => void;
}) {
  return (
    <>
      {detail.stage > 1 || detail.risks.active !== undefined ? (
        <RisksSection detail={detail} onInsurance={onInsurance} />
      ) : null}
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
