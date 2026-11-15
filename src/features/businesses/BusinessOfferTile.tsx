import type { BusinessOffer } from '@/application/businessesView';
import { formatMoneyExact } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { BusinessArt } from '@/ui/BusinessArt';
import { PriceChip } from '@/ui/PriceChip';
import { Tile, type TileVariant } from '@/ui/Tile';
import { AppText } from '@/ui/Typography';

import { formatPerDay } from './businessFormat';

function buyLabel(offer: BusinessOffer): string {
  return offer.affordable
    ? `Buy · ${formatMoneyExact(offer.business.price)}`
    : `Need ${formatMoneyExact(offer.shortfallCents)} more`;
}

function tileVariant(offer: BusinessOffer, highlighted: boolean): TileVariant {
  if (offer.status === 'locked') return 'locked';
  return highlighted ? 'highlighted' : 'open';
}

export function BusinessOfferTile({
  offer,
  highlighted,
  onReview,
}: {
  offer: BusinessOffer;
  highlighted: boolean;
  onReview: (offer: BusinessOffer) => void;
}) {
  const { business } = offer;
  const format = useMoneyFormat();
  const locked = offer.status === 'locked';
  const profit = `Profit ${formatPerDay(offer.profitPerDayCents)}`;
  return (
    <Tile
      variant={tileVariant(offer, highlighted)}
      accessibilityLabel={
        locked
          ? `${business.name}, ${profit}, ${formatMoneyExact(business.price)}, locked`
          : `Buy ${business.name}, ${profit}, ${buyLabel(offer)}`
      }
      onPress={locked ? undefined : () => onReview(offer)}
      disabled={!offer.affordable}
    >
      <BusinessArt id={business.id} />
      <AppText variant="heading" numberOfLines={1}>
        {business.name}
      </AppText>
      <AppText variant="caption" muted>
        {format.shortGain(offer.profitPerDayCents)}/d
      </AppText>
      <PriceChip
        label={format.short(business.price)}
        icon={locked ? 'lock' : undefined}
        tone={offer.affordable && !locked ? 'accent' : 'muted'}
      />
    </Tile>
  );
}
