import type { AvailableWalletUpgrade } from '@/application/walletUpgradeView';
import { useGame } from '@/features/game/GameContext';
import { gameErrorMessage } from '@/features/game/gameErrorMessage';
import { useConfirmation } from '@/ui/state/useConfirmation';

export function useWalletUpgrade() {
  const game = useGame();
  const { confirmation, open, close, submit } = useConfirmation<AvailableWalletUpgrade>();
  const confirm = () =>
    submit(async ({ attemptId, subject }) => {
      const outcome = await game.dispatch({
        id: attemptId,
        command: { type: 'UpgradeWallet', fromLevel: subject.level },
      });
      return outcome.ok ? undefined : gameErrorMessage(outcome.error);
    });
  const review = (upgrade: AvailableWalletUpgrade) => open(game.createCommandId(), upgrade);
  return { confirmation, review, close, confirm };
}
