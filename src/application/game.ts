import type { Content } from '@/content';
import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';

import { commitCommand } from './commitCommand';
import type { Clock, SaveStore } from './ports';
import { serialQueue } from './serialQueue';
import { snapshotStore } from './snapshotStore';
import { tapBatcher } from './tapBatcher';

export type GamePorts = {
  clock: Clock;
  store: SaveStore;
  content: Content;
  createId: () => string;
};

export type GameSnapshot = { readonly state: GameState; readonly pendingTaps: number };

export type Game = {
  getSnapshot: () => GameSnapshot;
  subscribe: (listener: () => void) => () => void;
  dispatch: (envelope: CommandEnvelope) => Promise<CommandOutcome>;
  tap: () => void;
  flushTaps: () => Promise<void>;
};

async function loadOrStart(ports: GamePorts): Promise<GameState> {
  const saved = await ports.store.load();
  if (saved !== undefined) return saved;
  const fresh = freshGameState({
    saveId: ports.createId(),
    economyVersion: ports.content.economyVersion,
    wallMs: ports.clock.wallMs(),
  });
  await ports.store.transact((tx) => tx.writeState(fresh));
  return fresh;
}

export async function createGame(ports: GamePorts): Promise<Game> {
  const snapshots = snapshotStore<GameSnapshot>({
    state: await loadOrStart(ports),
    pendingTaps: 0,
  });
  const queue = serialQueue();

  const run = (envelope: CommandEnvelope, settledTaps = 0) =>
    queue.run(async () => {
      const committed = await commitCommand(ports, { current: snapshots.get().state, envelope });
      snapshots.set({
        state: committed.state ?? snapshots.get().state,
        pendingTaps: snapshots.get().pendingTaps - settledTaps,
      });
      return committed.outcome;
    });

  const taps = tapBatcher({
    clock: ports.clock,
    windowMs: ports.content.economy.time.tapBatchMaxMs,
    send: (count) =>
      run({ id: `tap-${ports.createId()}`, command: { type: 'TapBatch', taps: count } }, count),
  });

  return {
    getSnapshot: snapshots.get,
    subscribe: snapshots.subscribe,
    dispatch: (envelope) => run(envelope),
    tap() {
      taps.add();
      const current = snapshots.get();
      snapshots.set({ ...current, pendingTaps: current.pendingTaps + 1 });
    },
    async flushTaps() {
      await taps.close();
      await queue.run(() => Promise.resolve());
    },
  };
}
