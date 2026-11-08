import type { PropertyListing } from '@/application/propertiesView';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { AppText } from '@/ui/Typography';
import { PropertyListingRow } from './PropertyListingRow';
const FILTERS = ['All', 'Owned'] as const;
export function PropertyRegister({
  listings,
  onBuy,
  onManage,
}: {
  listings: readonly PropertyListing[];
  onBuy: (listing: PropertyListing) => void;
  onManage: (listing: PropertyListing) => void;
}) {
  const filter = useSegment<string>('All');
  const visible = listings.filter(
    (listing) => filter.selected === 'All' || listing.status !== 'available',
  );
  return (
    <>
      <SegmentedControl
        options={FILTERS.map((label) => ({ value: label, label }))}
        selected={filter.selected}
        onSelect={filter.select}
      />
      {visible.length === 0 ? <AppText muted>No properties owned</AppText> : null}
      {visible.map((listing) => (
        <PropertyListingRow
          key={listing.property.id}
          listing={listing}
          index={listings.indexOf(listing)}
          onBuy={onBuy}
          onManage={onManage}
        />
      ))}
    </>
  );
}
