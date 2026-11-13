import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { gymRulesOf, runningGym } from './gymDemand';
import type { OwnedBusiness } from './owned';

export type AllHoursQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteAllHours(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): AllHoursQuote | undefined {
  const rules = gymRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { allHours } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(allHours.priceMultiple));
  const running = runningGym(business, pricing);
  if (running === undefined || business.stage < allHours.stage) {
    return { status: 'locked', unlockStage: allHours.stage, priceCents };
  }
  const { operation } = running;
  if (operation.allHours === 'installed') return { status: 'installed' };
  const installed = { ...business, gym: { ...operation, allHours: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
