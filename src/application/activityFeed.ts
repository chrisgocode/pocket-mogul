import type { ActivityEntry } from '@/domain/activity';

import type { SerialQueue } from './serialQueue';
import { snapshotStore } from './snapshotStore';

export type ActivityRead =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly entries: readonly ActivityEntry[] }
  | { readonly status: 'failed' };

export type ActivityFeed = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => ActivityRead;
};

type ActivitySource = {
  readonly queue: SerialQueue;
  readonly load: () => Promise<readonly ActivityEntry[]>;
  readonly kept: number;
};

function newestFirst(entries: readonly ActivityEntry[]): readonly ActivityEntry[] {
  return entries.flatMap((_, index) =>
    entries.slice(entries.length - 1 - index, entries.length - index),
  );
}

export function activityFeed(source: ActivitySource) {
  const store = snapshotStore<ActivityRead>({ status: 'idle' });
  const load = () =>
    source.queue.run(async () => {
      try {
        store.set({ status: 'loaded', entries: await source.load() });
      } catch {
        store.set({ status: 'failed' });
      }
    });
  const view: ActivityFeed = {
    subscribe(listener) {
      const { status } = store.get();
      if (status === 'idle' || status === 'failed') {
        store.set({ status: 'loading' });
        void load();
      }
      return store.subscribe(listener);
    },
    getSnapshot: store.get,
  };
  return {
    view,
    reload(): void {
      if (store.get().status === 'idle') return;
      store.set({ status: 'loading' });
      void load();
    },
    append(entries: readonly ActivityEntry[]): void {
      const read = store.get();
      if (read.status !== 'loaded' || entries.length === 0) return;
      store.set({
        status: 'loaded',
        entries: [...newestFirst(entries), ...read.entries].slice(0, source.kept),
      });
    },
  };
}
