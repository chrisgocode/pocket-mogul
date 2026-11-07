import type { Content } from '@/content';
import type { ActivityEntry } from '@/domain/activity';
import { boostRemainingMs, type RewardChange } from '@/domain/boost';
import type { CommandOutcome } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { serializeUnits } from '@/domain/money';

export type TelemetryEventName =
  | 'tutorial_step'
  | 'first_business'
  | 'wallet_upgrade'
  | 'business_upgrade'
  | 'rental_started'
  | 'trade_executed'
  | 'offline_settled'
  | 'taps_aggregated'
  | 'ad_requested'
  | 'ad_rewarded'
  | 'boost_activated'
  | 'ad_interstitial_shown'
  | 'ad_interstitial_suppressed'
  | 'ad_app_open_shown'
  | 'ad_banner_loaded'
  | 'ad_clicked'
  | 'save_failed'
  | 'migration_completed';

type TelemetryDetails = Readonly<Record<string, string | number | boolean>>;

export type TelemetryState = {
  readonly walletLevel: number;
  readonly totalAcceptedTaps: number;
  readonly businessesOwned: number;
  readonly propertiesOwned: number;
  readonly rentedProperties: number;
  readonly positionsHeld: number;
  readonly highestUnlockedTier: number;
  readonly peakNetWorthCents: string;
};

export type TelemetryEvent = {
  readonly name: TelemetryEventName;
  readonly economyVersion: number;
  readonly schemaVersion: number;
  readonly simulationMs: number;
  readonly details: TelemetryDetails;
  readonly state: TelemetryState;
};

export type TelemetryPort = { readonly record: (event: TelemetryEvent) => void };

const NO_TELEMETRY: TelemetryPort = { record: () => undefined };

type Named = { readonly name: TelemetryEventName; readonly details: TelemetryDetails };

export type ObservedCommit = {
  readonly outcome: CommandOutcome;
  readonly activity?: readonly ActivityEntry[] | undefined;
  readonly completedGoalIds?: readonly string[] | undefined;
  readonly rewardChange?: RewardChange | undefined;
};

export type AdRequest = 'load' | 'show';

const TAP_BOOST_PLACEMENT = 'tap_boost';

type EntryContext = { readonly firstBusiness: boolean };

type EntriesByKind = { [Kind in ActivityEntry['kind']]: Extract<ActivityEntry, { kind: Kind }> };

type Describers = {
  readonly [Kind in keyof EntriesByKind]: (
    entry: EntriesByKind[Kind],
    context: EntryContext,
  ) => Named | undefined;
};

const DESCRIBERS: Describers = {
  earnings: (entry) =>
    entry.taps > 0
      ? {
          name: 'taps_aggregated',
          details: { taps: entry.taps, tapCents: serializeUnits(entry.tapCents) },
        }
      : undefined,
  purchase: (entry, context) =>
    entry.asset === 'business' && context.firstBusiness
      ? { name: 'first_business', details: { businessId: entry.assetId } }
      : undefined,
  sale: () => undefined,
  upgrade: (entry) => {
    if (entry.target === 'wallet')
      return { name: 'wallet_upgrade', details: { level: entry.level } };
    if (entry.target === 'property') return undefined;
    const details = { businessId: entry.assetId, track: entry.track, level: entry.level };
    return { name: 'business_upgrade', details };
  },
  rental: (entry) =>
    entry.rented ? { name: 'rental_started', details: { propertyId: entry.assetId } } : undefined,
  trade: (entry) => ({
    name: 'trade_executed',
    details: { assetId: entry.assetId, side: entry.side },
  }),
  dividend: () => undefined,
  offline: (entry) => ({
    name: 'offline_settled',
    details: {
      awayMs: entry.awayMs,
      creditedMs: entry.creditedMs,
      capped: entry.creditedMs < entry.awayMs,
    },
  }),
};

function describe<Kind extends keyof EntriesByKind>(
  entry: { kind: Kind; payload: EntriesByKind[Kind] },
  context: EntryContext,
): Named | undefined {
  return DESCRIBERS[entry.kind](entry.payload, context);
}

function telemetryState(state: GameState): TelemetryState {
  return {
    walletLevel: state.tap.walletLevel,
    totalAcceptedTaps: state.tap.totalAcceptedTaps,
    businessesOwned: state.businesses.length,
    propertiesOwned: state.properties.length,
    rentedProperties: state.properties.filter((property) => property.rented).length,
    positionsHeld: state.positions.filter((position) => position.quantity > 0n).length,
    highestUnlockedTier: Math.max(...state.unlockedTiers),
    peakNetWorthCents: serializeUnits(state.peakNetWorthCents),
  };
}

function firstBusinessGoalIds(content: Content): ReadonlySet<string> {
  const goals = content.goals.filter(
    (goal) => goal.kind === 'first_action' && goal.action === 'business_purchase',
  );
  return new Set(goals.map((goal) => goal.id));
}

function rewardEvents(
  change: RewardChange | undefined,
  after: { state: GameState; content: Content },
): Named[] {
  if (change === 'granted')
    return [{ name: 'ad_rewarded', details: { placement: TAP_BOOST_PLACEMENT } }];
  if (change === undefined) return [];
  const details = {
    tapMultiplier: after.content.economy.boost.tapMultiplier,
    durationMs: boostRemainingMs(after.state.reward.boost),
  };
  return [{ name: 'boost_activated', details }];
}

type CommitView = { firstBusinessGoals: ReadonlySet<string>; content: Content; state: GameState };

function committedEvents(observed: ObservedCommit, view: CommitView): Named[] {
  if (!observed.outcome.ok) {
    const failed = observed.outcome.error === 'SAVE_FAILED';
    return failed ? [{ name: 'save_failed', details: {} }] : [];
  }
  const completed = observed.completedGoalIds ?? [];
  const context = {
    firstBusiness: completed.some((goalId) => view.firstBusinessGoals.has(goalId)),
  };
  const fromActivity = (observed.activity ?? [])
    .map((entry) => describe({ kind: entry.kind, payload: entry }, context))
    .filter((named) => named !== undefined);
  return [...fromActivity, ...rewardEvents(observed.rewardChange, view)];
}

export function gameTelemetry(ports: { telemetry?: TelemetryPort; content: Content }) {
  const port = ports.telemetry ?? NO_TELEMETRY;
  const firstBusinessGoals = firstBusinessGoalIds(ports.content);
  const send = (events: readonly Named[], state: GameState) => {
    for (const event of events) {
      try {
        port.record({
          ...event,
          economyVersion: state.economyVersion,
          schemaVersion: state.schemaVersion,
          simulationMs: state.clock.simulationMs,
          state: telemetryState(state),
        });
      } catch {
        return;
      }
    }
  };
  return {
    committed: (observed: ObservedCommit, state: GameState) =>
      send(committedEvents(observed, { firstBusinessGoals, content: ports.content, state }), state),
    adRequested: (request: AdRequest, state: GameState) =>
      send([{ name: 'ad_requested', details: { placement: TAP_BOOST_PLACEMENT, request } }], state),
    opened: (opened: { state: GameState; migratedFromSchema?: number }) => {
      if (opened.migratedFromSchema === undefined) return;
      const details = { fromVersion: opened.migratedFromSchema };
      send([{ name: 'migration_completed', details }], opened.state);
    },
  };
}
