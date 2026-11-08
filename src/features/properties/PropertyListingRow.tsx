import { Pressable, StyleSheet } from 'react-native';
import type { PropertyListing } from '@/application/propertiesView';
import { formatMoneyExact, formatRatePerMinute, moneyCents } from '@/domain/money';
import { PropertyRecordHeading } from './PropertyRecordHeading';
import { StatPair } from '@/ui/StatPair';
import { AppText } from '@/ui/Typography';
import { colors, radius, sectionColors, spacing } from '@/ui/tokens';
type PropertyListingRowProps = {
  listing: PropertyListing;
  index: number;
  onBuy: (listing: PropertyListing) => void;
  onManage: (listing: PropertyListing) => void;
};
function recordActionLabel(listing: PropertyListing): string {
  if (listing.status !== 'available') return 'Manage →';
  if (listing.affordable) return 'Review purchase →';
  return `Need ${formatMoneyExact(listing.shortfallCents)} more`;
}
export function PropertyListingRow({ listing, index, onBuy, onManage }: PropertyListingRowProps) {
  const { property, status } = listing;
  const net = status === 'vacant' ? moneyCents(0) : listing.rentedNetPerMinuteCents;
  const label =
    status === 'available'
      ? `Buy ${property.name}, ${formatMoneyExact(property.price)}`
      : `Manage ${property.name}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${listing.status}, renovation level ${listing.renovationLevel}, value ${formatMoneyExact(listing.valueCents)}, net ${formatRatePerMinute(net, 'full')}, gross ${formatRatePerMinute(status === 'vacant' ? moneyCents(0) : listing.grossPerMinuteCents, 'full')}`}
      disabled={status === 'available' && !listing.affordable}
      accessibilityState={{ disabled: status === 'available' && !listing.affordable }}
      onPress={() => (status === 'available' ? onBuy(listing) : onManage(listing))}
      style={styles.card}
    >
      <PropertyRecordHeading listing={listing} index={index} />
      <StatPair
        left={{
          label: status === 'available' ? 'Potential net / min' : 'Net / min',
          value: formatRatePerMinute(net, 'full'),
        }}
        right={{
          label: 'Gross / min',
          value: formatRatePerMinute(
            status === 'vacant' ? moneyCents(0) : listing.grossPerMinuteCents,
            'full',
          ),
        }}
      />
      <AppText variant="caption" style={styles.link}>
        {recordActionLabel(listing)}
      </AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: sectionColors.properties,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  link: { color: sectionColors.properties },
});
