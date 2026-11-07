import type { BusinessTrack, StaffRole } from './business/definition';
import type { IncomeBySource } from './gameState';
import { moneyCents, type MoneyCents, type QuantityMicrounits } from './money';
import type { TradeSide } from './tradeQuotes';

const EARNINGS_GROUP_MS = 600_000;

export const ACTIVITY_ENTRIES_KEPT = 2000;

export type OwnedAssetKind = 'business' | 'property';

export type UpgradeTarget = 'wallet' | 'property';

export type ImprovementTrack = 'units' | 'stage' | BusinessTrack | StaffRole;

export type GroupedEarnings = {
  readonly fromMs: number;
  readonly taps: number;
  readonly tapCents: MoneyCents;
  readonly businessCents: MoneyCents;
  readonly rentCents: MoneyCents;
};

type AssetDeal = {
  readonly asset: OwnedAssetKind;
  readonly assetId: string;
  readonly cashChangeCents: MoneyCents;
};

export type ActivityEvent =
  | ({ readonly kind: 'earnings' } & GroupedEarnings)
  | ({ readonly kind: 'purchase' } & AssetDeal)
  | ({ readonly kind: 'sale' } & AssetDeal)
  | {
      readonly kind: 'upgrade';
      readonly target: UpgradeTarget;
      readonly assetId: string;
      readonly track: string;
      readonly level: number;
      readonly cashChangeCents: MoneyCents;
    }
  | {
      readonly kind: 'improvement';
      readonly assetId: string;
      readonly track: ImprovementTrack;
      readonly level: number;
      readonly treasuryChangeCents: MoneyCents;
    }
  | { readonly kind: 'treasury'; readonly assetId: string; readonly cashChangeCents: MoneyCents }
  | { readonly kind: 'closure'; readonly assetId: string; readonly closedAtMs: number }
  | {
      readonly kind: 'incident';
      readonly assetId: string;
      readonly incidentId: string;
      readonly treasuryChangeCents: MoneyCents;
      readonly insured: boolean;
    }
  | { readonly kind: 'rental'; readonly assetId: string; readonly rented: boolean }
  | {
      readonly kind: 'trade';
      readonly side: TradeSide;
      readonly assetId: string;
      readonly quantity: QuantityMicrounits;
      readonly cashChangeCents: MoneyCents;
      readonly realizedProfitCents: MoneyCents;
    }
  | { readonly kind: 'dividend'; readonly cashChangeCents: MoneyCents }
  | {
      readonly kind: 'offline';
      readonly awayMs: number;
      readonly creditedMs: number;
      readonly earnings: IncomeBySource;
      readonly closures: readonly string[];
    };

export type ActivityKind = ActivityEvent['kind'];

export type ActivityEntry = ActivityEvent & {
  readonly sequence: number;
  readonly simulationMs: number;
};

export type LifetimeActivity = {
  readonly entries: number;
  readonly byKind: Readonly<Record<ActivityKind, number>>;
  readonly spentCents: MoneyCents;
  readonly proceedsCents: MoneyCents;
};

export type ActivityLog = {
  readonly open: GroupedEarnings | null;
  readonly lifetime: LifetimeActivity;
};

export type Earned = Omit<GroupedEarnings, 'fromMs'>;

export const NO_EARNINGS: Earned = {
  taps: 0,
  tapCents: moneyCents(0),
  businessCents: moneyCents(0),
  rentCents: moneyCents(0),
};

const zeroCounts: Readonly<Record<ActivityKind, number>> = {
  earnings: 0,
  purchase: 0,
  sale: 0,
  upgrade: 0,
  improvement: 0,
  treasury: 0,
  closure: 0,
  incident: 0,
  rental: 0,
  trade: 0,
  dividend: 0,
  offline: 0,
};

export const EMPTY_ACTIVITY: ActivityLog = {
  open: null,
  lifetime: {
    entries: 0,
    byKind: zeroCounts,
    spentCents: moneyCents(0),
    proceedsCents: moneyCents(0),
  },
};

function earnedAnything(earned: Earned): boolean {
  return earned.taps > 0 || earned.businessCents > 0n || earned.rentCents > 0n;
}

function withEarned(open: GroupedEarnings | null, earned: Earned, atMs: number): GroupedEarnings {
  const base = open ?? { ...NO_EARNINGS, fromMs: atMs };
  return {
    fromMs: base.fromMs,
    taps: base.taps + earned.taps,
    tapCents: moneyCents(base.tapCents + earned.tapCents),
    businessCents: moneyCents(base.businessCents + earned.businessCents),
    rentCents: moneyCents(base.rentCents + earned.rentCents),
  };
}

function tradeCash(event: ActivityEvent): bigint {
  const isDeal = event.kind === 'purchase' || event.kind === 'sale' || event.kind === 'upgrade';
  return isDeal || event.kind === 'trade' ? event.cashChangeCents : 0n;
}

function counted(lifetime: LifetimeActivity, event: ActivityEvent): LifetimeActivity {
  const cash = tradeCash(event);
  return {
    entries: lifetime.entries + 1,
    byKind: { ...lifetime.byKind, [event.kind]: lifetime.byKind[event.kind] + 1 },
    spentCents: moneyCents(lifetime.spentCents + (cash < 0n ? -cash : 0n)),
    proceedsCents: moneyCents(lifetime.proceedsCents + (cash > 0n ? cash : 0n)),
  };
}

function grouped(
  open: GroupedEarnings | null,
  change: { earned: Earned; events: readonly ActivityEvent[]; atMs: number },
): { open: GroupedEarnings | null; events: readonly ActivityEvent[] } {
  const { earned, events, atMs } = change;
  const next = earnedAnything(earned) ? withEarned(open, earned, atMs) : open;
  if (next === null) return { open: null, events };
  const closes = events.length > 0 || atMs - next.fromMs >= EARNINGS_GROUP_MS;
  if (!closes) return { open: next, events };
  return { open: null, events: [{ kind: 'earnings', ...next }, ...events] };
}

export function recordActivity(
  log: ActivityLog,
  change: { earned: Earned; events: readonly ActivityEvent[]; atMs: number },
): { log: ActivityLog; entries: readonly ActivityEntry[] } {
  const { open, events } = grouped(log.open, change);
  const entries = events.map((event, index) => ({
    ...event,
    sequence: log.lifetime.entries + index + 1,
    simulationMs: change.atMs,
  }));
  return { log: { open, lifetime: events.reduce(counted, log.lifetime) }, entries };
}
