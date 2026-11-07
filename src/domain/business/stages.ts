import { moneyCents, type MoneyCents } from '@/domain/money';

import { unitCap } from './core';
import { businessDayOf, stageRule, type BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

type StageRequirements = {
  readonly stage: number;
  readonly priceCents: MoneyCents;
  readonly units: number;
  readonly unitsNeeded: number;
  readonly daysOwned: number;
  readonly daysNeeded: number;
};

export type StageQuote =
  | { readonly status: 'final'; readonly stage: number }
  | ({ readonly status: 'not_ready' } & StageRequirements)
  | ({ readonly status: 'ready' } & StageRequirements);

export function daysOwned(
  business: OwnedBusiness,
  owning: { pricing: BusinessPricing; atMs: number },
) {
  return businessDayOf(owning.atMs, owning.pricing.rules) - business.purchasedDay;
}

export function quoteStage(
  business: OwnedBusiness,
  owning: { readonly pricing: BusinessPricing; readonly atMs: number },
): StageQuote {
  const { pricing } = owning;
  const { stage } = business;
  const next = stageRule(pricing.rules, stage + 1);
  if (next === undefined) return { status: 'final', stage };
  const requirements = {
    stage,
    priceCents: moneyCents(pricing.definition.price * BigInt(next.upgradePriceMultiple)),
    units: business.units,
    unitsNeeded: unitCap(business, pricing),
    daysOwned: daysOwned(business, owning),
    daysNeeded: next.daysOwnedToReach,
  };
  const ready =
    requirements.units >= requirements.unitsNeeded &&
    requirements.daysOwned >= requirements.daysNeeded;
  return { status: ready ? 'ready' : 'not_ready', ...requirements };
}
