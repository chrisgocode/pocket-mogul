import { ListedBusinessCard } from './ListedBusinessCard';
import { ListingForm } from './ListingForm';
import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { LISTING_STAGE } from '@/domain/business/listingState';
import { moneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';
import { useSegment } from '@/ui/state/useSegment';

import type { BusinessAction } from './businessAction';

const PERCENT = 100n;

export function ListingSection({
  detail,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
}) {
  const float = useSegment<string>('20');
  const ticker = useSegment<string>('');
  const { listing, business } = detail;
  if (detail.stage < LISTING_STAGE)
    return (
      <Card>
        <AppText muted>Going public unlocks at stage 4.</AppText>
      </Card>
    );
  if (listing.status === 'listed')
    return <ListedBusinessCard businessId={business.id} listing={listing} />;
  const floatPercent = Number(float.selected);
  const proceedsCents = moneyCents((detail.valuationCents * BigInt(floatPercent)) / PERCENT);
  return (
    <ListingForm
      float={float}
      ticker={ticker}
      proceedsCents={proceedsCents}
      closed={detail.operation === 'closed'}
      onReview={() =>
        onReview({
          kind: 'listing',
          business,
          floatPercent,
          ticker: ticker.selected,
          proceedsCents,
        })
      }
    />
  );
}
