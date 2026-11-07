import { useCallback } from 'react';

import { useGame } from '@/features/game/GameContext';

export function useSheetBreak(): () => void {
  const game = useGame();
  return useCallback(() => void game.naturalBreak('sheet_closed'), [game]);
}
