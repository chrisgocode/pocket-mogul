import { adOfferText, selectAdOffer } from '@/application/adOfferView';
import { getContent } from '@/content';
import type { AdOffer } from '@/domain/adRewards';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';

export function useAdOffer(offer: AdOffer, reward: string) {
  const game = useGame();
  const view = selectAdOffer(useGameSnapshot(), { content: getContent(), offer });
  return {
    text: view.status === 'hidden' ? undefined : adOfferText(view, reward),
    watch: () => void game.watchAd(offer),
  };
}
