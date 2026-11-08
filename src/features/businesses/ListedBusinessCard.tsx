import { router } from 'expo-router';

import { listingId, SHARE_PERCENT, type Listing } from '@/domain/business/listingState';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function ListedBusinessCard({
  businessId,
  listing,
}: {
  businessId: string;
  listing: Extract<Listing, { status: 'listed' }>;
}) {
  return (
    <Card>
      <AppText variant="heading">Listed · {listing.ticker}</AppText>
      <AppText>
        You own {String(listing.sharesHeld / SHARE_PERCENT)}% of the shares. Buy back all outside
        shares in Markets to delist.
      </AppText>
      <Button
        label="Trade shares in Markets"
        onPress={() =>
          router.push({
            pathname: '/markets/[assetId]',
            params: { assetId: listingId(businessId) },
          })
        }
      />
    </Card>
  );
}
