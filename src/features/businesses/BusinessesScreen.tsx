import { useRouter } from 'expo-router';

import { selectBusinesses, type BusinessOffer } from '@/application/businessesView';
import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';

import { BusinessTierSection } from './BusinessTierSection';
import { BuyBusinessSheet } from './BuyBusinessSheet';
import { NextTierCard } from './NextTierCard';

const buyBusinessCommand = (offer: BusinessOffer): GameCommand => ({
  type: 'BuyBusiness',
  businessId: offer.business.id,
});

export function BusinessesScreen() {
  const view = selectBusinesses(useGameSnapshot(), getContent());
  const { confirmation, review, close, confirm } = useGameAction(buyBusinessCommand);
  const router = useRouter();
  const manage = (offer: BusinessOffer) =>
    router.push({
      pathname: '/businesses/[businessId]',
      params: { businessId: offer.business.id },
    });
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
      {view.nextUnlock === undefined ? null : <NextTierCard unlock={view.nextUnlock} />}
      {view.owned.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          message="Save up from tapping to buy a Vending Machine, your first business."
        />
      ) : null}
      {view.tiers.map((tier) => (
        <BusinessTierSection key={tier.tier} tier={tier} onReview={review} onManage={manage} />
      ))}
      <BuyBusinessSheet
        confirmation={confirmation}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
