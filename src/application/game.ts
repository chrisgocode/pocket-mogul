import type { BillingPort } from './billingPort';
import { commitTaxEntitlement, type TaxEntitlementPort } from './taxEntitlement';
import type { Content } from '@/content';
import type { NaturalBreak } from '@/domain/adSchedule';
import type { ActivityEntry } from '@/domain/activity';
import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import type { ActivityFeed } from './activityFeed';
import { automaticAds, type AutomaticAdStage } from './automaticAds';
import { supportsEconomy } from './economy';
import { committer, type Committer } from './gameCommitter';
import { foregroundLoops } from './foregroundLoops';
import { lifecycle } from './gameLifecycle';
import type { Opened } from './gameSnapshots';
import { gameTaps } from './gameTaps';
import type { HistoryFeed } from './marketHistoryFeed';
import { openSave, type SaveNotice, type SaveStopReason } from './openSave';
import type { AdPort, AssetHistory, Clock, SaveStore } from './ports';
import { commitReset } from './resetSave';
import { rewardedBoost } from './rewardedBoost';
import type { TapBoost } from './tapBoost';
import { SAVE_FORMAT, type SaveFormat } from './saveFormat';
import { isTapBoosted, type TapBoostAd } from './tapBoostView';
import { gameTelemetry, type TelemetryPort } from './telemetry';

export type GamePorts = {
  clock: Clock;
  store: SaveStore;
  content: Content;
  ads: AdPort;
  billing: BillingPort;
  pastContent?: readonly Content[];
  createId: () => string;
  beforeWarmReturnSummary?: () => Promise<void>;
  telemetry?: TelemetryPort;
  saveFormat?: SaveFormat;
  taxEntitlement?: TaxEntitlementPort;
};

export type GameSnapshot = {
  readonly state: GameState;
  readonly pendingTaps: number;
  readonly pendingBoostedTaps: number;
  readonly unsavedElapsedMs: number;
  readonly unsavedBoostMs: number;
  readonly tapBoostAd: TapBoostAd;
  readonly automaticAd: AutomaticAdStage;
  readonly notice: SaveNotice;
};

export type GameEvent = { readonly type: 'goalsCompleted'; readonly goalIds: readonly string[] };

export type Game = {
  purchases: BillingPort;
  getSnapshot: () => GameSnapshot;
  subscribe: (listener: () => void) => () => void;
  subscribeEvents: (listener: (event: GameEvent) => void) => () => void;
  dispatch: (envelope: CommandEnvelope) => Promise<CommandOutcome>;
  tap: () => void;
  flushTaps: () => Promise<void>;
  pressTapBoost: () => Promise<void>;
  naturalBreak: (trigger: NaturalBreak) => Promise<void>;
  checkpoint: () => Promise<CommandOutcome>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  createCommandId: () => string;
  dismissNotice: () => void;
  restoreTaxExemption: () => Promise<CommandOutcome>;
  resetSave: (attemptId: string) => Promise<CommandOutcome>;
  readMarketHistory: (assetId: string) => Promise<AssetHistory>;
  readActivity: () => Promise<readonly ActivityEntry[]>;
  activity: ActivityFeed;
  marketHistory: (assetId: string) => HistoryFeed;
};

export type OpenedGame =
  | { readonly status: 'ready'; readonly game: Game }
  | { readonly status: 'stopped'; readonly reason: SaveStopReason };

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
    onWarmResume: (beforeSummary: () => Promise<void>) => settle(beforeSummary),
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
      if (outcome.ok) {
        await restoreEntitlement(ports, core);
        core.history.reload();
        core.activity.reload();
      }
      return outcome;
    },
    dismissNotice: () => core.snapshots.set({ ...core.snapshots.get(), notice: { kind: 'none' } }),
  };
}

function gameReads(ports: GamePorts, core: Committer) {
  return {
    readMarketHistory: (assetId: string) =>
      core.queue.run(() => ports.store.loadAssetHistory(assetId)),
    readActivity: () => core.queue.run(() => ports.store.loadActivity()),
    activity: core.activity.view,
    marketHistory: (assetId: string) => core.history.feed(assetId),
  };
}

function refreshWhileEarning(core: Committer) {
  return () => {
    const snapshot = core.snapshots.get();
    if (earnsPassiveIncome(snapshot.state) || isTapBoosted(snapshot)) core.refresh();
  };
}

function adsAroundPlay(
  ports: GamePorts,
  game: { core: Committer; boost: TapBoost; offline: ReturnType<typeof offlineSettlement> },
) {
  const ads = automaticAds(ports, { core: game.core, rewardedPresenting: game.boost.isPresenting });
  const onWarmResume = (awayMs: number) =>
    game.offline.onWarmResume(async () => {
      await ads.beforeReturnSummary(awayMs);
      await ports.beforeWarmReturnSummary?.();
    });
  return { ads, onWarmResume };
}

async function startGame(ports: GamePorts, opened: Opened): Promise<Game> {
  const core = committer(ports, opened);
  const wallMs = ports.clock.wallMs();
  await core.backUp({ revision: opened.state.revision, wallMs });
  const { offline, restoreTaxExemption } = await beginOffline(ports, core);
  const { dispatch, tap, flushTaps } = gameTaps({
    ...core,
    clock: ports.clock,
    windowMs: ports.content.economy.time.tapBatchMaxMs,
    createId: ports.createId,
    queueIdle: () => core.queue.run(() => Promise.resolve()),
  });
  const { boost, activatePendingGrant } = rewardedBoost(ports, { core, flushTaps });
  await activatePendingGrant();
  const { ads, onWarmResume } = adsAroundPlay(ports, { core, boost, offline });
  const checkpoint = () =>
    dispatch({ id: `checkpoint-${ports.createId()}`, command: { type: 'AdvanceTime' } });
  const loops = foregroundLoops({
    clock: ports.clock,
    checkpointMs: ports.content.economy.time.foregroundCheckpointMs,
    checkpoint: () => void checkpoint(),
    refresh: refreshWhileEarning(core),
  });
  return {
    purchases: ports.billing,
    restoreTaxExemption,
    getSnapshot: core.snapshots.get,
    subscribe: core.snapshots.subscribe,
    subscribeEvents: core.events.subscribe,
    dispatch,
    checkpoint,
    flushTaps,
    pressTapBoost: boost.press,
    ...ads.controls(tap),
    createCommandId: ports.createId,
    ...saveControls(ports, { core, flushTaps }),
    ...gameReads(ports, core),
    ...lifecycle({ core, boost, ads, checkpoint, loops, onWarmResume }),
  };
}

export async function createGame(ports: GamePorts): Promise<OpenedGame> {
  const opened = await openSave({
    store: ports.store,
    wallMs: ports.clock.wallMs(),
    createId: ports.createId,
    currentEconomyVersion: ports.content.economyVersion,
    supportsEconomy: supportsEconomy(ports),
    format: ports.saveFormat ?? SAVE_FORMAT,
  });
  if (opened.status === 'stopped') return opened;
  gameTelemetry(ports).opened(opened);
  return { status: 'ready', game: await startGame(ports, opened) };
}

export type { Committer } from './gameCommitter';

async function restoreEntitlement(ports: GamePorts, core: Committer): Promise<CommandOutcome> {
  if (ports.taxEntitlement === undefined) return { ok: false, error: 'TAX_RETURN_UNAVAILABLE' };
  try {
    const entitlement = await ports.taxEntitlement.current();
    if (entitlement.status === 'revoked') {
      const settled = await core.run({
        id: `tax-reconcile-${ports.createId()}`,
        command: { type: 'SettleOffline' },
      });
      if (!settled.ok) return settled;
    }
    return core.commit((current) => commitTaxEntitlement(ports, { current, entitlement }));
  } catch {
    return { ok: false, error: 'SAVE_FAILED' };
  }
}

async function beginOffline(ports: GamePorts, core: Committer) {
  const restoreTaxExemption = () => restoreEntitlement(ports, core);
  await restoreTaxExemption();
  const offline = offlineSettlement(ports, core);
  await offline.onLaunch();
  return { offline, restoreTaxExemption };
}
