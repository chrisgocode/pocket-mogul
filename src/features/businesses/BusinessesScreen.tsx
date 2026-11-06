import { selectBusinesses, type TierView } from '@/application/businessesView';
import { getContent } from '@/content';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

import { BusinessOfferRow } from './BusinessOfferRow';
import { BuyBusinessSheet } from './BuyBusinessSheet';
import { useBuyBusiness } from './useBuyBusiness';

function tierNote(tier: TierView): string {
  if (tier.unlocked || tier.unlockAtCents === undefined) return 'Available now';
  return `Unlocks at ${formatMoneyExact(tier.unlockAtCents)} peak net worth`;
}

export function BusinessesScreen() {
  const view = selectBusinesses(useGameSnapshot(), getContent());
  const { confirmation, review, close, confirm } = useBuyBusiness();
  const cash = formatMoneyExact(view.cashCents);
  const income = formatRatePerMinute(view.incomePerMinuteCents, 'full');
  return (
    <Screen>
      <Card>
        <AppText variant="caption" muted>
          Cash
        </AppText>
        <AppText variant="number" accessibilityLabel={`Cash ${cash}`}>
          {cash}
        </AppText>
        <AppText muted>Business income {income} net</AppText>
      </Card>
      {view.owned.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          message="Save up from tapping to buy a Vending Machine, your first business."
        />
      ) : null}
      {view.tiers.map((tier) => (
        <Section key={tier.tier} title={`Tier ${tier.tier}`} note={tierNote(tier)}>
          <Card>
            {tier.offers.map((offer) => (
              <BusinessOfferRow key={offer.business.id} offer={offer} onReview={review} />
            ))}
          </Card>
        </Section>
      ))}
      <BuyBusinessSheet
        confirmation={confirmation}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
