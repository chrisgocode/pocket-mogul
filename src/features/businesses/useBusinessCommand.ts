import type { GameCommand } from '@/domain/commands';
import { useGame } from '@/features/game/GameContext';

export function useBusinessCommand(): (command: GameCommand) => void {
  const game = useGame();
  return (command) => void game.dispatch({ id: game.createCommandId(), command });
}
