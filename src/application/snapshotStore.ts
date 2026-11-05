export type SnapshotStore<Snapshot> = {
  get: () => Snapshot;
  set: (next: Snapshot) => void;
  subscribe: (listener: () => void) => () => void;
};

export function snapshotStore<Snapshot>(initial: Snapshot): SnapshotStore<Snapshot> {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next) {
      current = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
