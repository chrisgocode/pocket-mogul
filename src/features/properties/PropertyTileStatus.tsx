import { StyleSheet } from 'react-native';

import type { PropertyListing } from '@/application/propertiesView';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { AppText } from '@/ui/Typography';
import { colors } from '@/ui/tokens';

export function PropertyTileStatus({ listing }: { listing: PropertyListing }) {
  const format = useMoneyFormat();
  const rate = format.shortRate(listing.rentedNetPerMinuteCents);
  if (listing.status === 'vacant')
    return (
      <AppText variant="number" style={styles.vacant}>
        Vacant · Lv {listing.renovationLevel}
      </AppText>
    );
  if (listing.status === 'available')
    return (
      <AppText variant="caption" muted>
        {rate}
      </AppText>
    );
  return (
    <AppText variant="number" style={styles.rented}>
      {rate} · Lv {listing.renovationLevel}
    </AppText>
  );
}

const styles = StyleSheet.create({
  vacant: { color: colors.loss },
  rented: { color: colors.gain },
});
