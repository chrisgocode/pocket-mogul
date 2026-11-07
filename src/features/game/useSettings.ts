import type { Settings, SettingsChange } from '@/domain/settings';

import { useGame, useGameSnapshot } from './GameContext';

export function useSettings(): { settings: Settings; update: (change: SettingsChange) => void } {
  const game = useGame();
  const { settings } = useGameSnapshot().state;
  const update = (change: SettingsChange) =>
    void game.dispatch({
      id: game.createCommandId(),
      command: { type: 'UpdateSettings', change },
    });
  return { settings, update };
}
