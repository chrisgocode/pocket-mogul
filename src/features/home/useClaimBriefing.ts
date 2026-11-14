import { useGame } from '@/features/game/GameContext';

export function useClaimBriefing() {
  const game = useGame();
  return () =>
    void game.dispatch({ id: game.createCommandId(), command: { type: 'ClaimBriefing' } });
}
