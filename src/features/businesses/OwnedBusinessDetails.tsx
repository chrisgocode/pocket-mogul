import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import type { PriceLevel } from '@/domain/business/definition';

import type { BusinessAction } from './businessAction';
import { BusinessOverviewCard } from './BusinessOverviewCard';
import { FlagshipSections, type FlagshipActions } from './FlagshipSections';
import { GrowSection } from './GrowSection';
import { PriceLevelCard } from './PriceLevelCard';
import type { InsuranceChange } from './InsuranceButton';
import { RisksSection } from './RisksSection';
import { SellCard } from './SellCard';
import { StaffSection } from './StaffSection';
import type { TreasuryActions } from './treasuryActions';
import { TreasuryCard } from './TreasuryCard';

export function OwnedBusinessDetails({
  detail,
  onReview,
  onPriceLevel,
  onInsurance,
  treasury,
  flagship,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
  onPriceLevel: (priceLevel: PriceLevel) => void;
  onInsurance: (change: InsuranceChange) => void;
  treasury: TreasuryActions;
  flagship: FlagshipActions;
}) {
  const { business } = detail;
  return (
    <>
      <BusinessOverviewCard detail={detail} />
      <PriceLevelCard detail={detail} onSelect={onPriceLevel} />
      <TreasuryCard detail={detail} actions={treasury} />
      <FlagshipSections detail={detail} actions={flagship} />
      <GrowSection
        detail={detail}
        onUnit={(unit) => onReview({ kind: 'unit', business, unit })}
        onImprove={(improvement) => onReview({ kind: 'improve', business, improvement })}
        onStage={(stage) => onReview({ kind: 'stage', business, stage })}
      />
      <StaffSection detail={detail} onReview={onReview} />
      <RisksSection detail={detail} onInsurance={onInsurance} />
      <SellCard
        name={business.name}
        sale={detail.sale}
        returnPercent={detail.saleReturnPercent}
        onReview={() => onReview({ kind: 'sell', business, sale: detail.sale })}
      />
    </>
  );
}
