import { StyleSheet, View } from 'react-native';
import type { PropertyListing } from '@/application/propertiesView';
import { formatMoneyExact } from '@/domain/money';
import { PropertyArt } from '@/ui/PropertyArt';
import { AppText } from '@/ui/Typography';
import { sectionColors, spacing } from '@/ui/tokens';
const STATUS_NAMES = { available: 'For sale', vacant: 'Vacant', rented: 'Rented' } as const;
const RECORD_DIGITS = 2;
export function PropertyRecordHeading({
  listing,
  index,
}: {
  listing: PropertyListing;
  index: number;
}) {
  const { property, status } = listing;
  return (
    <>
      <View style={styles.meta}>
        <AppText
          variant="caption"
          style={styles.number}
        >{`P${String(index + 1).padStart(RECORD_DIGITS, '0')}`}</AppText>
        <AppText variant="caption" muted>{`Renovation · Lv ${listing.renovationLevel}`}</AppText>
        <AppText variant="caption" muted>
          {STATUS_NAMES[status]}
        </AppText>
      </View>
      <View style={styles.body}>
        <View style={styles.name}>
          <AppText variant="heading">{property.name}</AppText>
          <AppText variant="title">{formatMoneyExact(listing.valueCents)}</AppText>
        </View>
        <PropertyArt index={index} />
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  number: { color: sectionColors.properties },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, gap: spacing.sm },
});
