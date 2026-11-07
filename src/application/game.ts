import type { Content } from '@/content';
import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { boostTime, type BoostTime } from './boostTime';
import { supportsEconomy } from './economy';
import { commitCommand, type CommandTime, type Committed } from './commitCommand';
import { foregroundTime, type ForegroundTime } from './foregroundTime';
import { foregroundLoops, type ForegroundLoops } from './foregroundLoops';
import { gameTaps, NO_SETTLED_TAPS, type SettledTaps } from './gameTaps';
import { marketHistoryFeeds, type HistoryFeed } from './marketHistoryFeed';
import { openSave, type SaveNotice, type SaveStopReason } from './openSave';
import type { AdPort, AssetHistory, Clock, SaveStore } from './ports';
import { commitReset } from './resetSave';
import { backUpIfDue } from './saveBackups';
import { serialQueue } from './serialQueue';
import { snapshotStore, type SnapshotStore } from './snapshotStore';
import { rewardedBoost } from './rewardedBoost';
import type { TapBoost } from './tapBoost';
import { isTapBoosted, type TapBoostAd } from './tapBoostView';

export type GamePorts = {
  clock: Clock;
  store: SaveStore;
  content: Content;
  ads: AdPort;
  pastContent?: readonly Content[];
  createId: () => string;
  beforeWarmReturnSummary?: () => Promise<void>;
};

export type GameSnapshot = {
  readonly state: GameState;
  readonly pendingTaps: number;
  readonly pendingBoostedTaps: number;
  readonly unsavedElapsedMs: number;
  readonly unsavedBoostMs: number;
  readonly tapBoostAd: TapBoostAd;
  readonly notice: SaveNotice;
};

export type Game = {
  getSnapshot: () => GameSnapshot;
  subscribe: (listener: () => void) => () => void;
  dispatch: (envelope: CommandEnvelope) => Promise<CommandOutcome>;
  tap: () => void;
  flushTaps: () => Promise<void>;
  pressTapBoost: () => Promise<void>;
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
  settled?: SettledTaps;
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

type PublishedChange = { state?: GameState | undefined; settled: SettledTaps };

type Clocks = { time: ForegroundTime; boostTime: BoostTime };

function publisher(snapshots: SnapshotStore<GameSnapshot>, clocks: Clocks) {
  return (change: PublishedChange) => {
    const current = snapshots.get();
    snapshots.set({
      ...current,
      state: change.state ?? current.state,
      pendingTaps: current.pendingTaps - change.settled.taps,
      pendingBoostedTaps: current.pendingBoostedTaps - change.settled.boostedTaps,
      unsavedElapsedMs: clocks.time.unsavedMs(),
      unsavedBoostMs: clocks.boostTime.unsavedMs(),
    });
  };
}

function openingSnapshot(opened: Opened): GameSnapshot {
  return {
    ...opened,
    pendingTaps: 0,
    pendingBoostedTaps: 0,
    unsavedElapsedMs: 0,
    unsavedBoostMs: 0,
    tapBoostAd: 'loading',
  };
}

type UnsavedTime = Pick<CommandTime, 'elapsedMs' | 'boostElapsedMs'>;

function gameClocks(clock: Clock) {
  const time = foregroundTime(clock);
  const boost = boostTime(clock);
  return {
    time,
    boostTime: boost,
    unsaved: (): UnsavedTime => ({
      elapsedMs: time.unsavedMs(),
      boostElapsedMs: boost.unsavedMs(),
    }),
    saved(unsaved: UnsavedTime) {
      time.saved(unsaved.elapsedMs);
      boost.saved(unsaved.boostElapsedMs);
    },
  };
}

function committer(ports: GamePorts, opened: Opened) {
  const snapshots = snapshotStore<GameSnapshot>(openingSnapshot(opened));
  const clocks = gameClocks(ports.clock);
  const queue = serialQueue();
  const history = marketHistoryFeeds({ queue, load: ports.store.loadAssetHistory });
  const publish = publisher(snapshots, clocks);
  const commit = (step: CommitStep, options: RunOptions = {}) => {
    const wallMs = options.issuedAtWallMs ?? ports.clock.wallMs();
    return queue.run(async () => {
      const unsaved = clocks.unsaved();
      const committed = await step(snapshots.get().state, { ...unsaved, wallMs });
      if (committed.history !== undefined) history.append(committed.history);
      if (committed.state !== undefined) {
        clocks.saved(unsaved);
        await backUpIfDue(ports.store, { revision: committed.state.revision, wallMs });
        await runBeforePublish(options.beforePublish);
      }
      publish({ state: committed.state, settled: options.settled ?? NO_SETTLED_TAPS });
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
    time: clocks.time,
    boostTime: clocks.boostTime,
    queue,
    history,
    run,
    commit,
    refresh: () => publish({ settled: NO_SETTLED_TAPS }),
  };
}

export type Committer = ReturnType<typeof committer>;

function earnsPassiveIncome(state: GameState): boolean {
  return state.businesses.length > 0 || state.properties.some((property) => property.rented);
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

type Lifecycle = { core: Committer; boost: TapBoost; checkpoint: () => Promise<CommandOutcome> };

function lifecycle(
  game: Lifecycle & { loops: ForegroundLoops; onWarmResume: () => Promise<unknown> },
) {
  const { core, loops } = game;
  let leftDuringAd = false;
  return {
    async pause() {
      leftDuringAd = game.boost.isPresenting();
      if (leftDuringAd) return;
      loops.stop();
      core.time.pause();
      core.boostTime.cover('background');
      await game.checkpoint();
    },
    async resume() {
      if (leftDuringAd) {
        leftDuringAd = false;
        return;
      }
      core.time.resume();
      core.boostTime.uncover('background');
      loops.start();
      await game.onWarmResume();
    },
  };
}

function refreshWhileEarning(core: Committer) {
  return () => {
    const snapshot = core.snapshots.get();
    if (earnsPassiveIncome(snapshot.state) || isTapBoosted(snapshot)) core.refresh();
  };
}

async function startGame(ports: GamePorts, opened: Opened): Promise<Game> {
  const core = committer(ports, opened);
  const wallMs = ports.clock.wallMs();
  await core.queue.run(() => backUpIfDue(ports.store, { revision: opened.state.revision, wallMs }));
  const offline = offlineSettlement(ports, core);
  await offline.onLaunch();
  const { dispatch, tap, flushTaps } = gameTaps({
    ...core,
    clock: ports.clock,
    windowMs: ports.content.economy.time.tapBatchMaxMs,
    createId: ports.createId,
    queueIdle: () => core.queue.run(() => Promise.resolve()),
  });
  const { boost, activatePendingGrant } = rewardedBoost(ports, { core, flushTaps });
  await activatePendingGrant();
  const checkpoint = () =>
    dispatch({ id: `checkpoint-${ports.createId()}`, command: { type: 'AdvanceTime' } });
  const loops = foregroundLoops({
    clock: ports.clock,
    checkpointMs: ports.content.economy.time.foregroundCheckpointMs,
    checkpoint: () => void checkpoint(),
    refresh: refreshWhileEarning(core),
  });
  return {
    getSnapshot: core.snapshots.get,
    subscribe: core.snapshots.subscribe,
    dispatch,
    checkpoint,
    tap,
    flushTaps,
    pressTapBoost: boost.press,
    createCommandId: ports.createId,
    ...saveControls(ports, { core, flushTaps }),
    readMarketHistory: (assetId) => core.queue.run(() => ports.store.loadAssetHistory(assetId)),
    marketHistory: (assetId) => core.history.feed(assetId),
    ...lifecycle({ core, boost, checkpoint, loops, onWarmResume: offline.onWarmResume }),
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
