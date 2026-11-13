import { useGame } from '@/features/game/GameContext';

export function useClaimGoals() {
  const game = useGame();
  return (goalIds: readonly string[]) =>
    void game.dispatch({ id: game.createCommandId(), command: { type: 'ClaimGoals', goalIds } });
}
