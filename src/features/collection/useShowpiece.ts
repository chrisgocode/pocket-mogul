import { useGame } from '@/features/game/GameContext';

export function useShowpiece() {
  const game = useGame();
  return (pieceId: string | null) =>
    void game.dispatch({ id: game.createCommandId(), command: { type: 'SetShowpiece', pieceId } });
}
