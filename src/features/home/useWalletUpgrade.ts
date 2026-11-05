import { useGame } from '@/features/game/GameContext';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { useConfirmation } from '@/ui/state/useConfirmation';

export function useWalletUpgrade() {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation();
  const confirm = (fromLevel: number) =>
    submit(async (attemptId) => {
      const outcome = await game.dispatch({
        id: attemptId,
        command: { type: 'UpgradeWallet', fromLevel },
      });
      return outcome.ok ? undefined : gameErrorMessage(outcome.error);
    });
  return { confirmation, review: () => open(game.createCommandId()), close, confirm };
}
