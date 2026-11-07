import { useGame } from '@/features/game/GameContext';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { useConfirmation } from '@/ui/state/useConfirmation';

export function useResetSave() {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation<'reset'>();
  const confirm = () =>
    submit(async ({ attemptId }) => {
      const outcome = await game.resetSave(attemptId);
      return outcome.ok ? undefined : gameErrorMessage(outcome.error);
    });
  const review = () => open(game.createCommandId(), 'reset');
  return { confirmation, review, close, confirm };
}
