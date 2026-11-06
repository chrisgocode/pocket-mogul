import type { Content } from '@/content';
import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';

import { commitCommand } from './commitCommand';
import { foregroundTime } from './foregroundTime';
import { foregroundLoops } from './foregroundLoops';
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

export type GameSnapshot = {
  readonly state: GameState;
  readonly pendingTaps: number;
  readonly unsavedElapsedMs: number;
};

export type Game = {
  getSnapshot: () => GameSnapshot;
  subscribe: (listener: () => void) => () => void;
  dispatch: (envelope: CommandEnvelope) => Promise<CommandOutcome>;
  tap: () => void;
  flushTaps: () => Promise<void>;
  checkpoint: () => Promise<CommandOutcome>;
  pause: () => Promise<void>;
  resume: () => void;
  createCommandId: () => string;
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

function committer(ports: GamePorts, initial: GameState) {
  const snapshots = snapshotStore<GameSnapshot>({
    state: initial,
    pendingTaps: 0,
    unsavedElapsedMs: 0,
  });
  const time = foregroundTime(ports.clock);
  const queue = serialQueue();
  const publish = (change: { state?: GameState | undefined; settledTaps: number }) => {
    const current = snapshots.get();
    snapshots.set({
      state: change.state ?? current.state,
      pendingTaps: current.pendingTaps - change.settledTaps,
      unsavedElapsedMs: time.unsavedMs(),
    });
  };
  const run = (envelope: CommandEnvelope, settledTaps = 0) =>
    queue.run(async () => {
      const elapsedMs = time.unsavedMs();
      const current = snapshots.get().state;
      const committed = await commitCommand(ports, { current, envelope, elapsedMs });
      if (committed.state !== undefined) time.saved(elapsedMs);
      publish({ state: committed.state, settledTaps });
      return committed.outcome;
    });
  return { snapshots, time, queue, run, refresh: () => publish({ settledTaps: 0 }) };
}

type Committer = ReturnType<typeof committer>;

function tapBatching(ports: GamePorts, core: Committer) {
  const taps = tapBatcher({
    clock: ports.clock,
    windowMs: ports.content.economy.time.tapBatchMaxMs,
    send: (count) =>
      core.run(
        { id: `tap-${ports.createId()}`, command: { type: 'TapBatch', taps: count } },
        count,
      ),
  });
  return {
    dispatch: async (envelope: CommandEnvelope) => {
      if (envelope.command.type !== 'TapBatch') await taps.close();
      return core.run(envelope);
    },
    tap: () => {
      taps.add();
      const current = core.snapshots.get();
      core.snapshots.set({ ...current, pendingTaps: current.pendingTaps + 1 });
    },
    flushTaps: async () => {
      await taps.close();
      await core.queue.run(() => Promise.resolve());
    },
  };
}

export async function createGame(ports: GamePorts): Promise<Game> {
  const core = committer(ports, await loadOrStart(ports));
  const { dispatch, tap, flushTaps } = tapBatching(ports, core);
  const checkpoint = () =>
    dispatch({ id: `checkpoint-${ports.createId()}`, command: { type: 'AdvanceTime' } });
  const loops = foregroundLoops({
    clock: ports.clock,
    checkpointMs: ports.content.economy.time.foregroundCheckpointMs,
    checkpoint: () => void checkpoint(),
    refresh: () => {
      if (core.snapshots.get().state.businesses.length > 0) core.refresh();
    },
  });
  return {
    getSnapshot: core.snapshots.get,
    subscribe: core.snapshots.subscribe,
    dispatch,
    checkpoint,
    tap,
    flushTaps,
    createCommandId: ports.createId,
    async pause() {
      loops.stop();
      core.time.pause();
      await checkpoint();
    },
    resume() {
      core.time.resume();
      loops.start();
    },
  };
}
