import type { MarketHistory } from '@/domain/market';

import type { AssetHistory } from './ports';
import type { SerialQueue } from './serialQueue';
import { snapshotStore, type SnapshotStore } from './snapshotStore';

export type HistoryRead =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly history: AssetHistory }
  | { readonly status: 'failed' };

export type HistoryFeed = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => HistoryRead;
};

type Feed = { readonly store: SnapshotStore<HistoryRead>; readonly view: HistoryFeed };

function withAppended(
  loaded: AssetHistory,
  change: { assetId: string; history: MarketHistory },
): AssetHistory {
  const { history, assetId } = change;
  const minutes = history.minutes.filter((minute) => minute.assetId === assetId);
  const hours = history.hours.filter((candle) => candle.assetId === assetId);
  return {
    minutes: [...loaded.minutes, ...minutes].filter(
      (minute) => minute.tick >= history.keepFrom.minuteTick,
    ),
    hours: [...loaded.hours, ...hours].filter((candle) => candle.hour >= history.keepFrom.hour),
  };
}

type HistorySource = {
  queue: SerialQueue;
  load: (assetId: string) => Promise<AssetHistory>;
};

type LoadInto = (assetId: string, store: SnapshotStore<HistoryRead>) => Promise<void>;

function historyLoader(source: HistorySource): LoadInto {
  return (assetId, store) =>
    source.queue.run(async () => {
      try {
        store.set({ status: 'loaded', history: await source.load(assetId) });
      } catch {
        store.set({ status: 'failed' });
      }
    });
}

function openFeed(assetId: string, load: LoadInto): Feed {
  const store = snapshotStore<HistoryRead>({ status: 'idle' });
  const subscribe = (listener: () => void) => {
    const { status } = store.get();
    if (status === 'idle' || status === 'failed') {
      store.set({ status: 'loading' });
      void load(assetId, store);
    }
    return store.subscribe(listener);
  };
  return { store, view: { subscribe, getSnapshot: store.get } };
}

export function marketHistoryFeeds(source: HistorySource) {
  const feeds = new Map<string, Feed>();
  const load = historyLoader(source);
  return {
    feed(assetId: string): HistoryFeed {
      const feed = feeds.get(assetId) ?? openFeed(assetId, load);
      feeds.set(assetId, feed);
      return feed.view;
    },
    reload(): void {
      for (const [assetId, { store }] of feeds) {
        if (store.get().status === 'idle') continue;
        store.set({ status: 'loading' });
        void load(assetId, store);
      }
    },
    append(history: MarketHistory): void {
      for (const [assetId, { store }] of feeds) {
        const read = store.get();
        if (read.status !== 'loaded') continue;
        store.set({ status: 'loaded', history: withAppended(read.history, { assetId, history }) });
      }
    },
  };
}
