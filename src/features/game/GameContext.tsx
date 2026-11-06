import { createContext, use, useCallback, useSyncExternalStore, type ReactNode } from 'react';

import type { Game, GameSnapshot } from '@/application/game';
import { useAppForeground } from '@/ui/effects/useAppForeground';

const GameContext = createContext<Game | undefined>(undefined);

export function GameProvider({ game, children }: { game: Game; children: ReactNode }) {
  const onLeave = useCallback(() => void game.pause(), [game]);
  const onReturn = useCallback(() => game.resume(), [game]);
  useAppForeground({ onLeave, onReturn });
  return <GameContext value={game}>{children}</GameContext>;
}

export function useGame(): Game {
  const game = use(GameContext);
  if (game === undefined) throw new Error('useGame must be used inside a GameProvider');
  return game;
}

export function useGameSnapshot(): GameSnapshot {
  const game = useGame();
  return useSyncExternalStore(game.subscribe, game.getSnapshot);
}
