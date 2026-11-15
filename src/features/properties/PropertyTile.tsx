import type { PropertyListing } from '@/application/propertiesView';
import { formatMoneyExact, formatRatePerMinute, moneyCents } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { PriceChip } from '@/ui/PriceChip';
import { PropertyArt } from '@/ui/PropertyArt';
import { Tile, type TileBadge } from '@/ui/Tile';
import { AppText } from '@/ui/Typography';

import { PropertyTileStatus } from './PropertyTileStatus';

type PropertyTileProps = {
  listing: PropertyListing;
  index: number;
  onBuy: (listing: PropertyListing) => void;
  onManage: (listing: PropertyListing) => void;
};

const VACANT: TileBadge = { tone: 'alert', icon: 'warning' };

function spokenLabel(listing: PropertyListing): string {
  const { property, status } = listing;
  const earning = status !== 'vacant';
  const net = earning ? listing.rentedNetPerMinuteCents : moneyCents(0);
  const gross = earning ? listing.grossPerMinuteCents : moneyCents(0);
  const action =
    status === 'available'
      ? `Buy ${property.name}, ${formatMoneyExact(property.price)}`
      : `Manage ${property.name}`;
  return `${action}, ${status}, renovation level ${listing.renovationLevel}, value ${formatMoneyExact(listing.valueCents)}, net ${formatRatePerMinute(net, 'full')}, gross ${formatRatePerMinute(gross, 'full')}`;
}

export function PropertyTile({ listing, index, onBuy, onManage }: PropertyTileProps) {
  const format = useMoneyFormat();
  const forSale = listing.status === 'available';
  return (
    <Tile
      variant={forSale ? 'open' : 'owned'}
      accessibilityLabel={spokenLabel(listing)}
      disabled={forSale && !listing.affordable}
      onPress={() => (forSale ? onBuy(listing) : onManage(listing))}
      badge={listing.status === 'vacant' ? VACANT : undefined}
    >
      <PropertyArt index={index} />
      <AppText variant="heading" numberOfLines={1}>
        {listing.property.name}
      </AppText>
      <PropertyTileStatus listing={listing} />
      {forSale ? (
        <PriceChip
          label={format.short(listing.property.price)}
          tone={listing.affordable ? 'accent' : 'muted'}
        />
      ) : null}
    </Tile>
  );
}
