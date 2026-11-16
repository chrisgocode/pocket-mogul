import type { GameCommand } from '@/domain/commands';
import { useSingleFlight } from '@/ui/state/useSingleFlight';

import { useGame } from './GameContext';
import { gameErrorMessage } from './gameErrorMessage';
import { useQuickBuyNotices } from './QuickBuyProvider';

export type QuickPurchase = { readonly command: GameCommand; readonly gained: string };

export function useQuickBuy(): (purchase: QuickPurchase) => void {
  const game = useGame();
  const { show } = useQuickBuyNotices();
  const singleFlight = useSingleFlight();
  return (purchase) =>
    void singleFlight(async () => {
      const outcome = await game.dispatch({
        id: game.createCommandId(),
        command: purchase.command,
      });
      if (outcome.ok) show({ tone: 'gain', message: purchase.gained });
      else if (outcome.error !== 'STALE_QUOTE')
        show({ tone: 'problem', message: gameErrorMessage(outcome.error) });
    });
}
