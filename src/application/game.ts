import type { Content } from '@/content';
import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { supportsEconomy } from './economy';
import { commitCommand, type CommandTime, type Committed } from './commitCommand';
import { foregroundTime, type ForegroundTime } from './foregroundTime';
import { foregroundLoops } from './foregroundLoops';
import { marketHistoryFeeds, type HistoryFeed } from './marketHistoryFeed';
import { openSave, type SaveNotice, type SaveStopReason } from './openSave';
import type { AssetHistory, Clock, SaveStore } from './ports';
import { commitReset } from './resetSave';
import { backUpIfDue } from './saveBackups';
import { serialQueue } from './serialQueue';
import { snapshotStore, type SnapshotStore } from './snapshotStore';
import { tapBatcher } from './tapBatcher';

export type GamePorts = {
  clock: Clock;
  store: SaveStore;
  content: Content;
  pastContent?: readonly Content[];
  createId: () => string;
  beforeWarmReturnSummary?: () => Promise<void>;
};

export type GameSnapshot = {
  readonly state: GameState;
  readonly pendingTaps: number;
  readonly unsavedElapsedMs: number;
  readonly notice: SaveNotice;
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
  dismissNotice: () => void;
  resetSave: (attemptId: string) => Promise<CommandOutcome>;
  readMarketHistory: (assetId: string) => Promise<AssetHistory>;
  marketHistory: (assetId: string) => HistoryFeed;
};

export type OpenedGame =
  | { readonly status: 'ready'; readonly game: Game }
  | { readonly status: 'stopped'; readonly reason: SaveStopReason };

type Opened = { readonly state: GameState; readonly notice: SaveNotice };

type RunOptions = {
  settledTaps?: number;
  issuedAtWallMs?: number;
  beforePublish?: (() => Promise<void>) | undefined;
};

type CommitStep = (current: GameState, time: CommandTime) => Promise<Committed>;

async function runBeforePublish(step: (() => Promise<void>) | undefined): Promise<void> {
  try {
    await step?.();
  } catch {
    return;
  }
}

type PublishedChange = { state?: GameState | undefined; settledTaps: number };

function publisher(snapshots: SnapshotStore<GameSnapshot>, time: ForegroundTime) {
  return (change: PublishedChange) => {
    const current = snapshots.get();
    snapshots.set({
      ...current,
      state: change.state ?? current.state,
      pendingTaps: current.pendingTaps - change.settledTaps,
      unsavedElapsedMs: time.unsavedMs(),
    });
  };
}

function committer(ports: GamePorts, opened: Opened) {
  const snapshots = snapshotStore<GameSnapshot>({
    ...opened,
    pendingTaps: 0,
    unsavedElapsedMs: 0,
  });
  const time = foregroundTime(ports.clock);
  const queue = serialQueue();
  const history = marketHistoryFeeds({ queue, load: ports.store.loadAssetHistory });
  const publish = publisher(snapshots, time);
  const commit = (step: CommitStep, options: RunOptions = {}) => {
    const wallMs = options.issuedAtWallMs ?? ports.clock.wallMs();
    return queue.run(async () => {
      const elapsedMs = time.unsavedMs();
      const committed = await step(snapshots.get().state, { elapsedMs, wallMs });
      if (committed.history !== undefined) history.append(committed.history);
      if (committed.state !== undefined) {
        time.saved(elapsedMs);
        await backUpIfDue(ports.store, { revision: committed.state.revision, wallMs });
        await runBeforePublish(options.beforePublish);
      }
      publish({ state: committed.state, settledTaps: options.settledTaps ?? 0 });
      return committed.outcome;
    });
  };
  const run = (envelope: CommandEnvelope, options: RunOptions = {}) =>
    commit(
      (current, stepTime) => commitCommand(ports, { current, envelope, time: stepTime }),
      options,
    );
  return {
    snapshots,
    time,
    queue,
    history,
    run,
    commit,
    refresh: () => publish({ settledTaps: 0 }),
  };
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
      const { clock, economyVersion } = core.snapshots.get().state;
      const awayMs = ports.clock.wallMs() - clock.lastWallCheckpointMs;
      if (awayMs !== 0 || economyVersion !== ports.content.economyVersion) await settle();
    },
    onWarmResume: () => settle(ports.beforeWarmReturnSummary),
  };
}

function saveControls(ports: GamePorts, game: { core: Committer; flushTaps: () => Promise<void> }) {
  const { core } = game;
  return {
    async resetSave(attemptId: string) {
      await game.flushTaps();
      const outcome = await core.commit((current, { wallMs }) =>
        commitReset(ports, { attemptId, current, wallMs }),
      );
      if (outcome.ok) core.history.reload();
      return outcome;
    },
    dismissNotice: () => core.snapshots.set({ ...core.snapshots.get(), notice: { kind: 'none' } }),
  };
}

async function startGame(ports: GamePorts, opened: Opened): Promise<Game> {
  const core = committer(ports, opened);
  const wallMs = ports.clock.wallMs();
  await core.queue.run(() => backUpIfDue(ports.store, { revision: opened.state.revision, wallMs }));
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
    ...saveControls(ports, { core, flushTaps }),
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

export async function createGame(ports: GamePorts): Promise<OpenedGame> {
  const opened = await openSave({
    store: ports.store,
    wallMs: ports.clock.wallMs(),
    createId: ports.createId,
    currentEconomyVersion: ports.content.economyVersion,
    supportsEconomy: supportsEconomy(ports),
  });
  if (opened.status === 'stopped') return opened;
  return { status: 'ready', game: await startGame(ports, opened) };
}
