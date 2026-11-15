import type { BusinessOffer } from '@/application/businessesView';
import { TileGrid } from '@/ui/TileGrid';

import { BusinessOfferTile } from './BusinessOfferTile';
import { OwnedBusinessTile } from './OwnedBusinessTile';

export function BusinessTiles({
  offers,
  highlightedId,
  onReview,
  onManage,
}: {
  offers: readonly BusinessOffer[];
  highlightedId: string | undefined;
  onReview: (offer: BusinessOffer) => void;
  onManage: (offer: BusinessOffer) => void;
}) {
  return (
    <TileGrid>
      {offers.map((offer) =>
        offer.status === 'owned' ? (
          <OwnedBusinessTile key={offer.business.id} offer={offer} onManage={onManage} />
        ) : (
          <BusinessOfferTile
            key={offer.business.id}
            offer={offer}
            highlighted={offer.business.id === highlightedId}
            onReview={onReview}
          />
        ),
      )}
    </TileGrid>
  );
}
