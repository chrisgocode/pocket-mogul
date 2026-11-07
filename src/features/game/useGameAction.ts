import type { GameCommand } from '@/domain/commands';
import { useSheetBreak } from '@/features/ads/useSheetBreak';
import { useConfirmation } from '@/ui/state/useConfirmation';

import { useGame } from './GameContext';
import { gameErrorMessage } from './gameErrorMessage';

export function useGameAction<Action>(toCommand: (action: Action) => GameCommand) {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation<Action>(useSheetBreak());
  const confirm = () =>
    submit(async ({ attemptId, subject }) => {
      const outcome = await game.dispatch({ id: attemptId, command: toCommand(subject) });
      return outcome.ok ? undefined : gameErrorMessage(outcome.error);
    });
  const review = (action: Action) => open(game.createCommandId(), action);
  return { confirmation, review, close, confirm };
}
