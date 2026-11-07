import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import { findBusiness, type BusinessEconomy, type BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

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

function settleBusiness(
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
