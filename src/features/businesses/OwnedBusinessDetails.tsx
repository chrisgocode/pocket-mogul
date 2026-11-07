import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import type { PriceLevel } from '@/domain/business/definition';

import type { BusinessAction } from './businessAction';
import { BusinessOverviewCard } from './BusinessOverviewCard';
import { GrowSection } from './GrowSection';
import { PriceLevelCard } from './PriceLevelCard';
import { SellCard } from './SellCard';
import type { TreasuryActions } from './treasuryActions';
import { TreasuryCard } from './TreasuryCard';

export function OwnedBusinessDetails({
  detail,
  onReview,
  onPriceLevel,
  treasury,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
  onPriceLevel: (priceLevel: PriceLevel) => void;
  treasury: TreasuryActions;
}) {
  const { business } = detail;
  return (
    <>
      <BusinessOverviewCard detail={detail} />
      <PriceLevelCard detail={detail} onSelect={onPriceLevel} />
      <TreasuryCard detail={detail} actions={treasury} />
      <GrowSection
        detail={detail}
        onUnit={(unit) => onReview({ kind: 'unit', business, unit })}
        onImprove={(improvement) => onReview({ kind: 'improve', business, improvement })}
      />
      <SellCard
        name={business.name}
        sale={detail.sale}
        returnPercent={detail.saleReturnPercent}
        onReview={() => onReview({ kind: 'sell', business, sale: detail.sale })}
      />
    </>
  );
}
