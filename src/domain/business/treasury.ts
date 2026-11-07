import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import { findBusiness, type BusinessEconomy, type BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { managerDecisions } from './staff';

export type BusinessClosure = { readonly businessId: string; readonly atMs: number };

export type BusinessSettlement = {
  readonly businesses: readonly OwnedBusiness[];
  readonly toCashCents: MoneyCents;
  readonly closures: readonly BusinessClosure[];
};

type Period = { readonly fromMs: number; readonly elapsedMs: number };

type Settled = {
  readonly business: OwnedBusiness;
  readonly toCashCents: bigint;
  readonly closedAtMs?: number;
};

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

type Settling = Settled & { readonly atMs: number };

function settleBusiness(
  business: OwnedBusiness,
  settlement: Period & { readonly pricing: BusinessPricing },
): Settled {
  const { pricing } = settlement;
  const { dayMs } = pricing.rules;
  const start: Settling = { business, toCashCents: 0n, atMs: settlement.fromMs };
  return segmentEnds(settlement, dayMs).reduce<Settling>((settled, endMs) => {
    if (settled.closedAtMs !== undefined) return settled;
    const segment = settleSegment(settled.business, {
      fromMs: settled.atMs,
      elapsedMs: endMs - settled.atMs,
      pricing,
    });
    const reachedBoundary = endMs > settled.atMs && endMs % dayMs === 0;
    const atBoundary = reachedBoundary && segment.closedAtMs === undefined;
    return {
      ...segment,
      business: atBoundary ? managerDecisions(segment.business, pricing) : segment.business,
      toCashCents: settled.toCashCents + segment.toCashCents,
      atMs: endMs,
    };
  }, start);
}

export function settleBusinesses(
  businesses: readonly OwnedBusiness[],
  settlement: Period & { readonly economy: BusinessEconomy },
): BusinessSettlement {
  const { rules, catalog } = settlement.economy;
  const settled = businesses.map((business): Settled => {
    const definition = findBusiness(catalog, business.definitionId);
    if (definition === undefined) return { business, toCashCents: 0n };
    return settleBusiness(business, { ...settlement, pricing: { definition, rules } });
  });
  return {
    businesses: settled.map((each) => each.business),
    toCashCents: moneyCents(settled.reduce<bigint>((total, each) => total + each.toCashCents, 0n)),
    closures: settled.flatMap((each) =>
      each.closedAtMs === undefined
        ? []
        : [{ businessId: each.business.definitionId, atMs: each.closedAtMs }],
    ),
  };
}
