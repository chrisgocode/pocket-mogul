import { useGame } from '@/features/game/GameContext';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { useConfirmation } from '@/ui/state/useConfirmation';

import { propertyActionCommand, type PropertyAction } from './propertyAction';

export function usePropertyAction() {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation<PropertyAction>();
  const confirm = () =>
    submit(async ({ attemptId, subject }) => {
      const outcome = await game.dispatch({
        id: attemptId,
        command: propertyActionCommand(subject),
      });
      return outcome.ok ? undefined : gameErrorMessage(outcome.error);
    });
  const review = (action: PropertyAction) => open(game.createCommandId(), action);
  return { confirmation, review, close, confirm };
}
