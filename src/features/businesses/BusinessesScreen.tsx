import { useLocalSearchParams, useRouter } from 'expo-router';

import { selectBusinesses, type BusinessOffer, type TierView } from '@/application/businessesView';
import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { TutorialHint } from '@/features/tutorial/TutorialHint';
import { useTutorial } from '@/features/tutorial/useTutorial';
import { Screen } from '@/ui/Screen';

import { BusinessSummary } from './BusinessSummary';
import { BusinessBrowser } from './BusinessBrowser';
import { BuyBusinessSheet } from './BuyBusinessSheet';

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
  const { tier } = useLocalSearchParams<{ tier?: string }>();
  const view = selectBusinesses(useGameSnapshot(), getContent());
  const { confirmation, review, close, confirm } = useGameAction(buyBusinessCommand);
  const manage = useManageBusiness();
  const highlightedId = useFirstBusinessHighlight(view.tiers);
  return (
    <Screen tone="businesses">
      <BusinessSummary />
      <TutorialHint steps={BUSINESS_STEPS} />
      <BusinessBrowser
        key={tier ?? 'default'}
        initialFilter={tier === undefined ? undefined : `Tier ${tier}`}
        view={view}
        highlightedId={highlightedId}
        onReview={review}
        onManage={manage}
      />
      <BuyBusinessSheet
        confirmation={confirmation}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
