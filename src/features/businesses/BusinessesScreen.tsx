import { useRouter } from 'expo-router';

import { selectBusinesses, type BusinessOffer, type TierView } from '@/application/businessesView';
import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { TutorialHint } from '@/features/tutorial/TutorialHint';
import { useTutorial } from '@/features/tutorial/useTutorial';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';

import { BusinessCashCard } from './BusinessCashCard';
import { BusinessTierSection } from './BusinessTierSection';
import { BuyBusinessSheet } from './BuyBusinessSheet';
import { NextTierCard } from './NextTierCard';

const buyBusinessCommand = (offer: BusinessOffer): GameCommand => ({
  type: 'BuyBusiness',
  businessId: offer.business.id,
});

const BUSINESS_STEPS = ['buyBusiness'] as const;

const firstOfferId = (tiers: readonly TierView[]): string | undefined =>
  tiers.flatMap((tier) => tier.offers).find((offer) => offer.status === 'available')?.business.id;

function useManageBusiness(): (offer: BusinessOffer) => void {
  const router = useRouter();
  return (offer) =>
    router.push({
      pathname: '/businesses/[businessId]',
      params: { businessId: offer.business.id },
    });
}

function useFirstBusinessHighlight(tiers: readonly TierView[]): string | undefined {
  return useTutorial().isOn('buyBusiness') ? firstOfferId(tiers) : undefined;
}

export function BusinessesScreen() {
  const view = selectBusinesses(useGameSnapshot(), getContent());
  const { confirmation, review, close, confirm } = useGameAction(buyBusinessCommand);
  const manage = useManageBusiness();
  const highlightedId = useFirstBusinessHighlight(view.tiers);
  return (
    <Screen>
      <BusinessCashCard
        cashCents={view.cashCents}
        incomePerMinuteCents={view.incomePerMinuteCents}
      />
      <TutorialHint steps={BUSINESS_STEPS} />
      {view.nextUnlock === undefined ? null : <NextTierCard unlock={view.nextUnlock} />}
      {view.owned.length === 0 ? (
        <EmptyState
          title="No businesses yet"
          message="Save up from tapping to buy a Vending Machine, your first business."
        />
      ) : null}
      {view.tiers.map((tier) => (
        <BusinessTierSection
          key={tier.tier}
          tier={tier}
          highlightedId={highlightedId}
          onReview={review}
          onManage={manage}
        />
      ))}
      <BuyBusinessSheet
        confirmation={confirmation}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
