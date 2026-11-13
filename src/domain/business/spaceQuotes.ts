import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { runningSpace, spaceRulesOf } from './spaceDemand';

export type BoostersQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteBoosters(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): BoostersQuote | undefined {
  const rules = spaceRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { boosters } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(boosters.priceMultiple));
  const running = runningSpace(business, pricing);
  if (running === undefined || business.stage < boosters.stage) {
    return { status: 'locked', unlockStage: boosters.stage, priceCents };
  }
  const { operation } = running;
  if (operation.boosters === 'installed') return { status: 'installed' };
  const installed = { ...business, space: { ...operation, boosters: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
