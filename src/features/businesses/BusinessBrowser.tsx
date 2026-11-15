import type { BusinessOffer, BusinessesView } from '@/application/businessesView';
import { formatMoneyExact } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { EmptyState } from '@/ui/EmptyState';
import { PriceChip } from '@/ui/PriceChip';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';

import { BusinessTiles } from './BusinessTiles';

const FILTERS = ['Owned', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] as const;

type BrowserProps = {
  view: BusinessesView;
  initialFilter?: string | undefined;
  highlightedId: string | undefined;
  onReview: (offer: BusinessOffer) => void;
  onManage: (offer: BusinessOffer) => void;
};

function defaultFilter(view: BusinessesView): string {
  return view.owned.length === 0 ? 'Tier 1' : 'Owned';
}

export function BusinessBrowser({
  view,
  highlightedId,
  onReview,
  onManage,
  initialFilter,
}: BrowserProps) {
  const format = useMoneyFormat();
  const filter = useSegment<string>(initialFilter ?? defaultFilter(view));
  const tier = view.tiers.find((item) => `Tier ${item.tier}` === filter.selected);
  const offers = tier?.offers ?? view.owned;
  return (
    <>
      <SegmentedControl
        options={FILTERS.map((label) => ({ value: label, label }))}
        selected={filter.selected}
        onSelect={filter.select}
      />
      {tier?.unlockAtCents !== undefined && !tier.unlocked ? (
        <PriceChip
          icon="lock"
          label={`Unlocks at ${format.short(tier.unlockAtCents)} peak net worth`}
          accessibilityLabel={`Unlocks at ${formatMoneyExact(tier.unlockAtCents)} peak net worth`}
        />
      ) : null}
      {offers.length === 0 ? (
        <EmptyState title="No businesses yet" message="Explore Tier 1" />
      ) : null}
      <BusinessTiles
        offers={offers}
        highlightedId={highlightedId}
        onReview={onReview}
        onManage={onManage}
      />
    </>
  );
}
