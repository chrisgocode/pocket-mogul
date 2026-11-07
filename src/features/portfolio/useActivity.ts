import { useSyncExternalStore } from 'react';

import type { ActivityRead } from '@/application/activityFeed';
import { useGame } from '@/features/game/GameContext';

export function useActivity(): ActivityRead {
  const { activity } = useGame();
  return useSyncExternalStore(activity.subscribe, activity.getSnapshot);
}
