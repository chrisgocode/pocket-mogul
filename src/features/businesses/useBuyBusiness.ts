import type { BusinessOffer } from '@/application/businessesView';
import { useGame } from '@/features/game/GameContext';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { useConfirmation } from '@/ui/state/useConfirmation';

export function useBuyBusiness() {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation<BusinessOffer>();
  const confirm = () =>
    submit(async ({ attemptId, subject }) => {
      const outcome = await game.dispatch({
        id: attemptId,
        command: { type: 'BuyBusiness', businessId: subject.business.id },
      });
      return outcome.ok ? undefined : gameErrorMessage(outcome.error);
    });
  const review = (offer: BusinessOffer) => open(game.createCommandId(), offer);
  return { confirmation, review, close, confirm };
}
