import type { Content } from '@/content';
import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';

import { commitCommand } from './commitCommand';
import { foregroundTime } from './foregroundTime';
import { foregroundLoops } from './foregroundLoops';
import { marketHistoryFeeds, type HistoryFeed } from './marketHistoryFeed';
import type { AssetHistory, Clock, SaveStore } from './ports';
import { serialQueue } from './serialQueue';
import { snapshotStore } from './snapshotStore';
import { tapBatcher } from './tapBatcher';

export type GamePorts = {
  clock: Clock;
  store: SaveStore;
  content: Content;
  createId: () => string;
  beforeWarmReturnSummary?: () => Promise<void>;
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
  resume: () => Promise<void>;
  createCommandId: () => string;
  readMarketHistory: (assetId: string) => Promise<AssetHistory>;
  marketHistory: (assetId: string) => HistoryFeed;
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

type RunOptions = {
  settledTaps?: number;
  issuedAtWallMs?: number;
  beforePublish?: (() => Promise<void>) | undefined;
};

async function runBeforePublish(step: (() => Promise<void>) | undefined): Promise<void> {
  try {
    await step?.();
  } catch {
    return;
  }
}

function committer(ports: GamePorts, initial: GameState) {
  const snapshots = snapshotStore<GameSnapshot>({
    state: initial,
    pendingTaps: 0,
    unsavedElapsedMs: 0,
  });
  const time = foregroundTime(ports.clock);
  const queue = serialQueue();
  const history = marketHistoryFeeds({ queue, load: ports.store.loadAssetHistory });
  const publish = (change: { state?: GameState | undefined; settledTaps: number }) => {
    const current = snapshots.get();
    snapshots.set({
      state: change.state ?? current.state,
      pendingTaps: current.pendingTaps - change.settledTaps,
      unsavedElapsedMs: time.unsavedMs(),
    });
  };
  const run = (envelope: CommandEnvelope, options: RunOptions = {}) => {
    const wallMs = options.issuedAtWallMs ?? ports.clock.wallMs();
    return queue.run(async () => {
      const elapsedMs = time.unsavedMs();
      const current = snapshots.get().state;
      const committed = await commitCommand(ports, {
        current,
        envelope,
        time: { elapsedMs, wallMs },
      });
      if (committed.history !== undefined) history.append(committed.history);
      if (committed.state !== undefined) {
        time.saved(elapsedMs);
        await runBeforePublish(options.beforePublish);
      }
      publish({ state: committed.state, settledTaps: options.settledTaps ?? 0 });
      return committed.outcome;
    });
  };
  return { snapshots, time, queue, history, run, refresh: () => publish({ settledTaps: 0 }) };
}

type Committer = ReturnType<typeof committer>;

function earnsPassiveIncome(state: GameState): boolean {
  return state.businesses.length > 0 || state.properties.some((property) => property.rented);
}

function tapBatching(ports: GamePorts, core: Committer) {
  const taps = tapBatcher({
    clock: ports.clock,
    windowMs: ports.content.economy.time.tapBatchMaxMs,
    send: (count) =>
      core.run(
        { id: `tap-${ports.createId()}`, command: { type: 'TapBatch', taps: count } },
        { settledTaps: count },
      ),
  });
  return {
    dispatch: async (envelope: CommandEnvelope) => {
      const issuedAtWallMs = ports.clock.wallMs();
      if (envelope.command.type !== 'TapBatch') await taps.close();
      return core.run(envelope, { issuedAtWallMs });
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

function offlineSettlement(ports: GamePorts, core: Committer) {
  const settle = (beforePublish?: () => Promise<void>) =>
    core.run(
      { id: `settle-${ports.createId()}`, command: { type: 'SettleOffline' } },
      { beforePublish },
    );
  return {
    async onLaunch() {
      const { lastWallCheckpointMs } = core.snapshots.get().state.clock;
      if (ports.clock.wallMs() !== lastWallCheckpointMs) await settle();
    },
    onWarmResume: () => settle(ports.beforeWarmReturnSummary),
  };
}

export async function createGame(ports: GamePorts): Promise<Game> {
  const core = committer(ports, await loadOrStart(ports));
  const offline = offlineSettlement(ports, core);
  await offline.onLaunch();
  const { dispatch, tap, flushTaps } = tapBatching(ports, core);
  const checkpoint = () =>
    dispatch({ id: `checkpoint-${ports.createId()}`, command: { type: 'AdvanceTime' } });
  const loops = foregroundLoops({
    clock: ports.clock,
    checkpointMs: ports.content.economy.time.foregroundCheckpointMs,
    checkpoint: () => void checkpoint(),
    refresh: () => {
      if (earnsPassiveIncome(core.snapshots.get().state)) core.refresh();
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
    readMarketHistory: (assetId) => core.queue.run(() => ports.store.loadAssetHistory(assetId)),
    marketHistory: (assetId) => core.history.feed(assetId),
    async pause() {
      loops.stop();
      core.time.pause();
      await checkpoint();
    },
    async resume() {
      core.time.resume();
      loops.start();
      await offline.onWarmResume();
    },
  };
}
