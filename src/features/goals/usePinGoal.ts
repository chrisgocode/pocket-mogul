import { useGame } from '@/features/game/GameContext';

export function usePinGoal() {
  const game = useGame();
  return (goalId: string | null) =>
    void game.dispatch({ id: game.createCommandId(), command: { type: 'PinGoal', goalId } });
}
