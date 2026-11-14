import { Section } from '@/ui/Section';
import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import type { PriceLevel } from '@/domain/business/definition';

import type { BusinessAction } from './businessAction';
import { BusinessHeading } from './BusinessHeading';
import { BusinessAdvanced } from './BusinessAdvanced';
import { BusinessOverviewCard } from './BusinessOverviewCard';
import { FlagshipSections, type FlagshipActions } from './FlagshipSections';
import { GrowSection } from './GrowSection';
import { PriceLevelCard } from './PriceLevelCard';
import { RushDayOffer } from './RushDayOffer';
import type { InsuranceChange } from './InsuranceButton';
import { SellCard } from './SellCard';
import { StaffSection } from './StaffSection';
import type { TreasuryActions } from './treasuryActions';
import { TreasuryCard } from './TreasuryCard';

type OwnedBusinessDetailsProps = {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
  onPriceLevel: (priceLevel: PriceLevel) => void;
  onInsurance: (change: InsuranceChange) => void;
  treasury: TreasuryActions;
  flagship: FlagshipActions;
};
export function OwnedBusinessDetails({
  detail,
  onReview,
  onPriceLevel,
  onInsurance,
  treasury,
  flagship,
}: OwnedBusinessDetailsProps) {
  const { business } = detail;
  return (
    <>
      <BusinessHeading detail={detail} />
      <BusinessOverviewCard detail={detail} />
      <RushDayOffer businessId={business.id} />
      <PriceLevelCard detail={detail} onSelect={onPriceLevel} />
      <Section title="Treasury">
        <TreasuryCard detail={detail} actions={treasury} />
      </Section>
      {detail.stage > 1 ? <FlagshipSections detail={detail} actions={flagship} /> : null}
      <GrowSection
        detail={detail}
        onUnit={(unit) => onReview({ kind: 'unit', business, unit })}
        onImprove={(improvement) => onReview({ kind: 'improve', business, improvement })}
        onStage={(stage) => onReview({ kind: 'stage', business, stage })}
      />
      <StaffSection detail={detail} onReview={onReview} />
      <BusinessAdvanced detail={detail} onInsurance={onInsurance} onReview={onReview} />
      <SellCard
        name={business.name}
        sale={detail.sale}
        returnPercent={detail.saleReturnPercent}
        onReview={() => onReview({ kind: 'sell', business, sale: detail.sale })}
      />
    </>
  );
}
