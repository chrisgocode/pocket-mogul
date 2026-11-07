import type { BusinessOffer, TierView } from '@/application/businessesView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import { BusinessOfferRow } from './BusinessOfferRow';

function tierNote(tier: TierView): string {
  if (tier.unlocked || tier.unlockAtCents === undefined) return 'Available now';
  return `Unlocks at ${formatMoneyExact(tier.unlockAtCents)} peak net worth`;
}

export function BusinessTierSection({
  tier,
  highlightedId,
  onReview,
  onManage,
}: {
  tier: TierView;
  highlightedId: string | undefined;
  onReview: (offer: BusinessOffer) => void;
  onManage: (offer: BusinessOffer) => void;
}) {
  return (
    <Section title={`Tier ${tier.tier}`} note={tierNote(tier)}>
      <Card>
        {tier.offers.map((offer) => (
          <BusinessOfferRow
            key={offer.business.id}
            offer={offer}
            highlighted={offer.business.id === highlightedId}
            onReview={onReview}
            onManage={onManage}
          />
        ))}
      </Card>
    </Section>
  );
}
