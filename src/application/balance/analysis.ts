import type { OptionKind } from './options';
import type { BalanceRun, Purchase } from './simulation';

export const REPORTED_GOALS = [
  { goalId: 'first_wallet_upgrade', label: 'First wallet upgrade' },
  { goalId: 'first_business', label: 'First business' },
  { goalId: 'peak_1m', label: '$1M peak net worth' },
  { goalId: 'peak_10m', label: '$10M peak net worth' },
  { goalId: 'peak_1b', label: '$1B peak net worth' },
] as const;

const DOMINANT_SPEND_PERCENT = 50;
const STALL_ACTIVE_MS = 1_800_000;
const WHOLE_PERCENT = 100;
const HALF = 2;

export type SpendShare = {
  readonly kind: OptionKind;
  readonly purchases: number;
  readonly percent: number;
  readonly medianPaybackMinutes: number;
};

export type Stall = { readonly fromActiveMs: number; readonly toActiveMs: number };

export type RunAnalysis = {
  readonly spend: readonly SpendShare[];
  readonly dominant: SpendShare | undefined;
  readonly longestStall: Stall;
  readonly stalled: boolean;
};

type Before<Value> = (value: Value, other: Value) => boolean;

function inserted<Value>(sorted: readonly Value[], entry: { value: Value; before: Before<Value> }) {
  const index = sorted.findIndex((existing) => entry.before(entry.value, existing));
  if (index === -1) return [...sorted, entry.value];
  return [...sorted.slice(0, index), entry.value, ...sorted.slice(index)];
}

function sortedBy<Value>(values: readonly Value[], before: Before<Value>): readonly Value[] {
  return values.reduce<readonly Value[]>(
    (sorted, value) => inserted(sorted, { value, before }),
    [],
  );
}

function median(values: readonly number[]): number {
  const sorted = sortedBy(values, (value, other) => value < other);
  const middle = Math.floor(sorted.length / HALF);
  if (sorted.length % HALF === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / HALF;
}

function spendShares(purchases: readonly Purchase[]): readonly SpendShare[] {
  const total = purchases.reduce((sum, purchase) => sum + purchase.priceCents, 0n);
  const kinds = [...new Set(purchases.map((purchase) => purchase.kind))];
  const shares = kinds.map((kind) => {
    const ofKind = purchases.filter((purchase) => purchase.kind === kind);
    const spent = ofKind.reduce((sum, purchase) => sum + purchase.priceCents, 0n);
    return {
      kind,
      purchases: ofKind.length,
      percent: total === 0n ? 0 : (Number(spent) * WHOLE_PERCENT) / Number(total),
      medianPaybackMinutes: median(ofKind.map((purchase) => purchase.paybackMinutes)),
    };
  });
  return sortedBy(shares, (share, other) => share.percent > other.percent);
}

function longestStall(run: BalanceRun): Stall {
  const marks = [0, ...run.purchases.map((purchase) => purchase.activeMs), run.final.activeMs];
  return marks.slice(1).reduce<Stall>(
    (longest, toActiveMs, index) => {
      const fromActiveMs = marks[index] ?? 0;
      const longer = toActiveMs - fromActiveMs > longest.toActiveMs - longest.fromActiveMs;
      return longer ? { fromActiveMs, toActiveMs } : longest;
    },
    { fromActiveMs: 0, toActiveMs: 0 },
  );
}

export function analyzeRun(run: BalanceRun): RunAnalysis {
  const spend = spendShares(run.purchases);
  const stall = longestStall(run);
  return {
    spend,
    dominant: spend.find((share) => share.percent > DOMINANT_SPEND_PERCENT),
    longestStall: stall,
    stalled: stall.toActiveMs - stall.fromActiveMs > STALL_ACTIVE_MS,
  };
}
