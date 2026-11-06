import { useSyncExternalStore } from 'react';

import type { HistoryRead } from '@/application/marketHistoryFeed';
import { useGame } from '@/features/game/GameContext';

export function useMarketHistory(assetId: string): HistoryRead {
  const feed = useGame().marketHistory(assetId);
  return useSyncExternalStore(feed.subscribe, feed.getSnapshot);
}
