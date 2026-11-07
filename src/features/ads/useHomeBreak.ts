import { useCallback } from 'react';

import { useGame } from '@/features/game/GameContext';

export function useHomeBreak(): () => void {
  const game = useGame();
  return useCallback(() => void game.naturalBreak('left_home'), [game]);
}
