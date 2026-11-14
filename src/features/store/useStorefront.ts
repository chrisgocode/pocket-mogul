import { useSyncExternalStore } from 'react';

import { useGame } from '@/features/game/GameContext';

export function useStorefront() {
  const { storefront } = useGame();
  const front = useSyncExternalStore(storefront.subscribe, storefront.getSnapshot);
  return { storefront, front };
}
