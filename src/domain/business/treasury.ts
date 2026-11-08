import { TOTAL_SHARES } from './listingState';
import { splitListedPayout } from './listingPayout';
import type { ShareholderPayout } from './listingState';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { startCarWashDay } from './carWash';
import { profitPerDayCents, quoteBusinessDay } from './core';
import { endedDeliveryDay, startDeliveryDay } from './delivery';
import { findBusiness, type BusinessEconomy, type BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { startBusinessDay, type StruckIncident } from './risks';
import { managerDecisions } from './staff';
import { answerTakeover } from './takeovers';
import { restockedByStaff, soldVendingDay, withVendingUnlocked } from './vending';

export type BusinessClosure = { readonly businessId: string; readonly atMs: number };

export type BusinessAccounting = {
  readonly businessId: string;
  readonly phase: 'income' | 'boundary';
  readonly elapsedMs: number;
  readonly grossPerDayCents: bigint;
  readonly profitCents: bigint;
  readonly shares: bigint;
  readonly payoutCents: bigint;
};

export type BusinessSettlement = {
  readonly accounting: readonly BusinessAccounting[];
  readonly outsidePayouts: readonly ShareholderPayout[];
  readonly businesses: readonly OwnedBusiness[];
  readonly toCashCents: MoneyCents;
  readonly closures: readonly BusinessClosure[];
  readonly incidents: readonly StruckIncident[];
};

type Period = { readonly fromMs: number; readonly elapsedMs: number };

type Settled = {
  readonly business: OwnedBusiness;
  readonly toCashCents: bigint;
  readonly toOutsideCents?: bigint;
  readonly closedAtMs?: number;
  readonly incidents?: readonly StruckIncident[];
  readonly accounting?: readonly BusinessAccounting[];
};

type Settlement = Period & { readonly pricing: BusinessPricing; readonly seed: string };

const PERCENT = 100n;

function floorDivide(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  return numerator % denominator < 0n ? quotient - 1n : quotient;
}

function msUntilEmpty(business: OwnedBusiness, loss: { profit: bigint; dayMs: bigint }): bigint {
  const balance = business.treasuryCents * loss.dayMs + BigInt(business.profitRemainder);
  const perMs = 0n - loss.profit;
  return (balance + perMs - 1n) / perMs;
}

function closed(business: OwnedBusiness, atMs: number): Settled {
  return {
    business: {
      ...business,
      status: 'closed',
      treasuryCents: moneyCents(0),
      profitRemainder: 0,
    },
    toCashCents: 0n,
    closedAtMs: atMs,
  };
}

function settledProfit(business: OwnedBusiness, accrual: { settled: bigint; remainder: bigint }) {
  if (accrual.settled <= 0n) {
    return {
      business: {
        ...business,
        treasuryCents: moneyCents(business.treasuryCents + accrual.settled),
        profitRemainder: Number(accrual.remainder),
      },
      toCashCents: 0n,
    };
  }
  const listed = splitListedPayout(business, accrual.settled);
  if (listed !== undefined)
    return {
      ...listed,
      business: { ...listed.business, profitRemainder: Number(accrual.remainder) },
    };
  const payout =
    accrual.settled * BigInt(business.payoutPercent) + BigInt(business.payoutRemainder);
  const toCashCents = payout / PERCENT;
  return {
    business: {
      ...business,
      treasuryCents: moneyCents(business.treasuryCents + accrual.settled - toCashCents),
      profitRemainder: Number(accrual.remainder),
      payoutRemainder: Number(payout % PERCENT),
    },
    toCashCents,
  };
}

function settleSegment(
  business: OwnedBusiness,
  settlement: Period & { readonly pricing: BusinessPricing },
): Settled {
  if (business.status === 'closed') return { business, toCashCents: 0n };
  const profit = profitPerDayCents(business, settlement.pricing);
  const dayMs = BigInt(settlement.pricing.rules.dayMs);
  const elapsedMs = BigInt(settlement.elapsedMs);
  if (profit < 0n) {
    const emptyAfterMs = msUntilEmpty(business, { profit, dayMs });
    if (emptyAfterMs <= elapsedMs)
      return closed(business, settlement.fromMs + Number(emptyAfterMs));
  }
  const numerator = profit * elapsedMs + BigInt(business.profitRemainder);
  const settled = floorDivide(numerator, dayMs);
  return settledProfit(business, { settled, remainder: numerator - settled * dayMs });
}

function segmentEnds(period: Period, dayMs: number): number[] {
  const endMs = period.fromMs + period.elapsedMs;
  const firstDay = Math.floor(period.fromMs / dayMs) + 1;
  const boundaries = Array.from(
    { length: Math.max(0, Math.floor(endMs / dayMs) - firstDay + 1) },
    (_, index) => (firstDay + index) * dayMs,
  );
  return boundaries[boundaries.length - 1] === endMs ? boundaries : [...boundaries, endMs];
}

type Settling = Settled & {
  readonly atMs: number;
  readonly incidents: readonly StruckIncident[];
  readonly accounting: readonly BusinessAccounting[];
};

function dayStarted(segment: Settled, boundary: { settlement: Settlement; endMs: number }) {
  const { pricing, seed } = boundary.settlement;
  const day = boundary.endMs / pricing.rules.dayMs;
  const ended = endedDeliveryDay(soldVendingDay(segment.business, pricing), { pricing, day });
  const opened = withVendingUnlocked(ended, pricing);
  const started = startBusinessDay(opened, { pricing, seed, day });
  const restocked = restockedByStaff(started.business, pricing);
  const washing = startCarWashDay(restocked, { pricing, seed, day });
  const managed = managerDecisions(washing, pricing);
  const offered = startDeliveryDay(managed, { pricing, seed, day });
  return { ...started, business: answerTakeover(offered, { pricing, seed, day }) };
}

function segmentAccounting(
  before: OwnedBusiness,
  step: { segment: Settled; after: OwnedBusiness; elapsedMs: number; pricing: BusinessPricing },
): BusinessAccounting[] {
  const { segment, after, pricing } = step;
  const quote = quoteBusinessDay(before, pricing);
  const gross =
    quote.revenueCents +
    quote.memberFeesCents +
    quote.contractRevenueCents +
    quote.managerBonusCents;
  const shares = before.listing.status === 'private' ? TOTAL_SHARES : before.listing.sharesHeld;
  const cash = segment.toCashCents + (segment.toOutsideCents ?? 0n);
  return [
    {
      businessId: before.definitionId,
      phase: 'income',
      elapsedMs: step.elapsedMs,
      grossPerDayCents: before.status === 'closed' ? 0n : gross,
      shares,
      payoutCents: segment.toCashCents,
      profitCents: segment.business.treasuryCents - before.treasuryCents + cash,
    },
    {
      businessId: before.definitionId,
      phase: 'boundary',
      elapsedMs: 0,
      grossPerDayCents: 0n,
      shares,
      payoutCents: 0n,
      profitCents:
        after.treasuryCents -
        segment.business.treasuryCents +
        after.capitalizedSpendCents -
        segment.business.capitalizedSpendCents,
    },
  ];
}

function settleBusiness(business: OwnedBusiness, settlement: Settlement): Settled {
  const { pricing } = settlement;
  const start: Settling = {
    business,
    toCashCents: 0n,
    atMs: settlement.fromMs,
    incidents: [],
    accounting: [],
  };
  return segmentEnds(settlement, pricing.rules.dayMs).reduce<Settling>((settled, endMs) => {
    if (settled.closedAtMs !== undefined) return settled;
    const segment = settleSegment(settled.business, {
      fromMs: settled.atMs,
      elapsedMs: endMs - settled.atMs,
      pricing,
    });
    const reachedBoundary = endMs > settled.atMs && endMs % pricing.rules.dayMs === 0;
    const atBoundary = reachedBoundary && segment.closedAtMs === undefined;
    const day = atBoundary
      ? dayStarted(segment, { settlement, endMs })
      : { business: segment.business, incidents: [] };
    return {
      ...segment,
      accounting: [
        ...settled.accounting,
        ...segmentAccounting(settled.business, {
          segment,
          after: day.business,
          pricing,
          elapsedMs: (segment.closedAtMs ?? endMs) - settled.atMs,
        }),
      ],
      business: day.business,
      toCashCents: settled.toCashCents + segment.toCashCents,
      toOutsideCents: (settled.toOutsideCents ?? 0n) + (segment.toOutsideCents ?? 0n),
      atMs: endMs,
      incidents: [...settled.incidents, ...day.incidents],
    };
  }, start);
}

export function settleBusinesses(
  businesses: readonly OwnedBusiness[],
  settlement: Period & { readonly economy: BusinessEconomy; readonly seed: string },
): BusinessSettlement {
  const { rules, catalog } = settlement.economy;
  const settled = businesses.map((business): Settled => {
    const definition = findBusiness(catalog, business.definitionId);
    if (definition === undefined) return { business, toCashCents: 0n };
    return settleBusiness(business, { ...settlement, pricing: { definition, rules } });
  });
  return {
    accounting: settled.flatMap((each) => each.accounting ?? []),
    outsidePayouts: settled
      .filter((each) => (each.toOutsideCents ?? 0n) > 0n)
      .map((each) => ({
        businessId: each.business.definitionId,
        paidCents: moneyCents(each.toOutsideCents ?? 0n),
      })),
    businesses: settled.map((each) => each.business),
    toCashCents: moneyCents(settled.reduce<bigint>((total, each) => total + each.toCashCents, 0n)),
    closures: settled.flatMap((each) =>
      each.closedAtMs === undefined
        ? []
        : [{ businessId: each.business.definitionId, atMs: each.closedAtMs }],
    ),
    incidents: settled.flatMap((each) => each.incidents ?? []),
  };
}
