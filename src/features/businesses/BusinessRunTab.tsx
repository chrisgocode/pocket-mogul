import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import type { PriceLevel } from '@/domain/business/definition';
import { Section } from '@/ui/Section';

import { BusinessOverviewCard } from './BusinessOverviewCard';
import type { InsuranceChange } from './InsuranceButton';
import { RisksSection } from './RisksSection';
import { FlagshipSections, type FlagshipActions } from './FlagshipSections';
import { PriceLevelCard } from './PriceLevelCard';
import { RushDayOffer } from './RushDayOffer';
import type { TreasuryActions } from './treasuryActions';
import { TreasuryCard } from './TreasuryCard';

export type RunTabActions = {
  onInsurance: (change: InsuranceChange) => void;
  onPriceLevel: (priceLevel: PriceLevel) => void;
  treasury: TreasuryActions;
  flagship: FlagshipActions;
};

export function BusinessRunTab({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: RunTabActions;
}) {
  return (
    <>
      {detail.stage > 1 ? <FlagshipSections detail={detail} actions={actions.flagship} /> : null}
      <BusinessOverviewCard detail={detail} />
      <RushDayOffer businessId={detail.business.id} />
      <PriceLevelCard detail={detail} onSelect={actions.onPriceLevel} />
      <Section title="Treasury">
        <TreasuryCard detail={detail} actions={actions.treasury} />
      </Section>
      {detail.stage > 1 || detail.risks.active !== undefined ? (
        <RisksSection detail={detail} onInsurance={actions.onInsurance} />
      ) : null}
    </>
  );
}
