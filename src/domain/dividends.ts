import { moneyCents, type MoneyCents, type QuantityMicrounits } from './money';
import type { Position } from './tradeQuotes';

const QUANTITY_UNITS_PER_SHARE = 1_000_000n;
const MS_PER_SIMULATION_HOUR = 3_600_000;
const ENTITLEMENT_DENOMINATOR = QUANTITY_UNITS_PER_SHARE * BigInt(MS_PER_SIMULATION_HOUR);

export type DividendAccrual = {
  readonly instrumentId: string;
  readonly pendingCents: MoneyCents;
  readonly entitlementNumerator: bigint;
};

export type DividendRates = Readonly<Record<string, MoneyCents>>;

export type DividendHoldings = {
  readonly accruals: readonly DividendAccrual[];
  readonly positions: readonly Position[];
};

export type DividendAdvance = {
  readonly accruals: readonly DividendAccrual[];
  readonly paidCents: MoneyCents;
};

type Period = { readonly elapsedMs: number; readonly rates: DividendRates };

const rateOf = (rates: DividendRates, instrumentId: string): bigint => rates[instrumentId] ?? 0n;

function upsert(accruals: readonly DividendAccrual[], updated: DividendAccrual): DividendAccrual[] {
  const exists = accruals.some((accrual) => accrual.instrumentId === updated.instrumentId);
  if (!exists) return [...accruals, updated];
  return accruals.map((accrual) =>
    accrual.instrumentId === updated.instrumentId ? updated : accrual,
  );
}

function accrueHolding(
  accruals: readonly DividendAccrual[],
  holding: { position: Position; period: Period },
): DividendAccrual[] {
  const { position, period } = holding;
  const { instrumentId } = position;
  const current = accruals.find((accrual) => accrual.instrumentId === instrumentId);
  const earned = rateOf(period.rates, instrumentId) * position.quantity * BigInt(period.elapsedMs);
  const numerator = (current?.entitlementNumerator ?? 0n) + earned;
  return upsert(accruals, {
    instrumentId,
    pendingCents: moneyCents((current?.pendingCents ?? 0n) + numerator / ENTITLEMENT_DENOMINATOR),
    entitlementNumerator: numerator % ENTITLEMENT_DENOMINATOR,
  });
}

function accrue(holdings: DividendHoldings, period: Period): readonly DividendAccrual[] {
  return holdings.positions
    .filter(
      (position) => position.quantity > 0n && rateOf(period.rates, position.instrumentId) > 0n,
    )
    .reduce<readonly DividendAccrual[]>(
      (accruals, position) => accrueHolding(accruals, { position, period }),
      holdings.accruals,
    );
}

function payOut(accruals: readonly DividendAccrual[]): DividendAdvance {
  return {
    paidCents: pendingDividendsCents(accruals),
    accruals: accruals
      .filter((accrual) => accrual.entitlementNumerator > 0n)
      .map(({ instrumentId, entitlementNumerator }) => ({
        instrumentId,
        pendingCents: moneyCents(0),
        entitlementNumerator,
      })),
  };
}

function segmentEnds(fromMs: number, toMs: number): number[] {
  const firstBoundary = (Math.floor(fromMs / MS_PER_SIMULATION_HOUR) + 1) * MS_PER_SIMULATION_HOUR;
  const ends: number[] = [];
  for (let boundary = firstBoundary; boundary < toMs; boundary += MS_PER_SIMULATION_HOUR) {
    ends.push(boundary);
  }
  return [...ends, toMs];
}

type Settled = DividendAdvance & { readonly atMs: number };

function settleSegment(
  settled: Settled,
  segment: { endMs: number; holdings: DividendHoldings; rates: DividendRates },
): Settled {
  const accruals = accrue(
    { ...segment.holdings, accruals: settled.accruals },
    { elapsedMs: segment.endMs - settled.atMs, rates: segment.rates },
  );
  const reachesPayout =
    segment.endMs > settled.atMs && segment.endMs % MS_PER_SIMULATION_HOUR === 0;
  if (!reachesPayout) return { ...settled, accruals, atMs: segment.endMs };
  const payout = payOut(accruals);
  return {
    accruals: payout.accruals,
    paidCents: moneyCents(settled.paidCents + payout.paidCents),
    atMs: segment.endMs,
  };
}

export function advanceDividends(
  holdings: DividendHoldings,
  span: { fromMs: number; toMs: number; rates: DividendRates },
): DividendAdvance {
  const start: Settled = {
    accruals: holdings.accruals,
    paidCents: moneyCents(0),
    atMs: span.fromMs,
  };
  const settled = segmentEnds(span.fromMs, span.toMs).reduce(
    (current, endMs) => settleSegment(current, { endMs, holdings, rates: span.rates }),
    start,
  );
  return { accruals: settled.accruals, paidCents: settled.paidCents };
}

export function pendingDividendsCents(accruals: readonly DividendAccrual[]): MoneyCents {
  return moneyCents(accruals.reduce<bigint>((total, accrual) => total + accrual.pendingCents, 0n));
}

export function dividendPerHourCents(
  quantity: QuantityMicrounits,
  centsPerSharePerHour: MoneyCents,
): MoneyCents {
  return moneyCents((quantity * centsPerSharePerHour) / QUANTITY_UNITS_PER_SHARE);
}

export function msUntilDividendPayout(simulationMs: number): number {
  return MS_PER_SIMULATION_HOUR - (simulationMs % MS_PER_SIMULATION_HOUR);
}
