import { ACTIVITY_ENTRIES_KEPT } from '@/domain/activity';

import { activityFeed } from './activityFeed';
import type { Committed } from './commitCommand';
import type { GameEvent, GamePorts } from './game';
import { marketHistoryFeeds } from './marketHistoryFeed';
import type { SerialQueue } from './serialQueue';

function eventChannel() {
  const listeners = new Set<(event: GameEvent) => void>();
  return {
    emit: (event: GameEvent) => {
      for (const listener of listeners) listener(event);
    },
    subscribe: (listener: (event: GameEvent) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

type EventChannel = ReturnType<typeof eventChannel>;

export function announce(events: EventChannel, committed: Committed): void {
  const goalIds = committed.completedGoalIds ?? [];
  if (goalIds.length > 0) events.emit({ type: 'goalsCompleted', goalIds });
}

export function feeds(ports: GamePorts, queue: SerialQueue) {
  const history = marketHistoryFeeds({ queue, load: ports.store.loadAssetHistory });
  const activity = activityFeed({
    queue,
    load: ports.store.loadActivity,
    kept: ACTIVITY_ENTRIES_KEPT,
  });
  return {
    history,
    activity,
    events: eventChannel(),
    record(committed: Committed) {
      if (committed.history !== undefined) history.append(committed.history);
      activity.append(committed.activity ?? []);
    },
  };
}
