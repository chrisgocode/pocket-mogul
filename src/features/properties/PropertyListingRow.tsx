import { StyleSheet, View } from 'react-native';

import type { PropertyListing } from '@/application/propertiesView';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';
import { spacing } from '@/ui/tokens';

const STATUS_NAMES = { available: undefined, vacant: 'Vacant', rented: 'Rented' } as const;

export function PropertyListingRow({
  listing,
  onBuy,
  onManage,
}: {
  listing: PropertyListing;
  onBuy: (listing: PropertyListing) => void;
  onManage: (listing: PropertyListing) => void;
}) {
  const { property, status } = listing;
  const rent = `Rents for ${formatRatePerMinute(listing.rentedNetPerMinuteCents, 'full')} net`;
  const label = priceLabel('Buy', { ...listing, priceCents: property.price });
  return (
    <View style={styles.listing}>
      <ListRow
        leading={<LogoMark logo={property.logo} />}
        title={property.name}
        subtitle={rent}
        value={status === 'available' ? formatMoneyExact(property.price) : 'Owned'}
        detail={STATUS_NAMES[status]}
      />
      {status === 'available' ? (
        <Button
          label={label}
          accessibilityLabel={`Buy ${property.name}, ${label}`}
          onPress={() => onBuy(listing)}
          disabled={!listing.affordable}
        />
      ) : (
        <Button
          label="Manage"
          accessibilityLabel={`Manage ${property.name}`}
          variant="secondary"
          onPress={() => onManage(listing)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listing: { gap: spacing.sm },
});
