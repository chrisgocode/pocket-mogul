import { useGame } from '@/features/game/GameContext';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { useConfirmation } from '@/ui/state/useConfirmation';

import { businessActionCommand, type BusinessAction } from './businessAction';

export function useBusinessAction() {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation<BusinessAction>();
  const confirm = () =>
    submit(async ({ attemptId, subject }) => {
      const outcome = await game.dispatch({
        id: attemptId,
        command: businessActionCommand(subject),
      });
      return outcome.ok ? undefined : gameErrorMessage(outcome.error);
    });
  const review = (action: BusinessAction) => open(game.createCommandId(), action);
  return { confirmation, review, close, confirm };
}
