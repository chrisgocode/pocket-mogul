import type { OwnedBusinessDetail } from '@/application/businessDetailView';

import type { BusinessAction } from './businessAction';
import { BusinessAdvanced } from './BusinessAdvanced';
import { SellCard } from './SellCard';

export function BusinessMoreTab({
  detail,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
}) {
  const { business } = detail;
  return (
    <>
      <BusinessAdvanced detail={detail} onReview={onReview} />
      <SellCard
        name={business.name}
        sale={detail.sale}
        returnPercent={detail.saleReturnPercent}
        onReview={() => onReview({ kind: 'sell', business, sale: detail.sale })}
      />
    </>
  );
}
