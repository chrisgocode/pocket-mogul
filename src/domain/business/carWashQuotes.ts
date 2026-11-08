import { moneyCents, type MoneyCents } from '@/domain/money';

import { carWashRulesOf, runningCarWash } from './carWashDemand';
import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type DetailingQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteDetailing(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): DetailingQuote | undefined {
  const rules = carWashRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { detailing } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(detailing.priceMultiple));
  const running = runningCarWash(business, pricing);
  if (running === undefined || business.stage < detailing.stage) {
    return { status: 'locked', unlockStage: detailing.stage, priceCents };
  }
  const { operation } = running;
  if (operation.detailing === 'installed') return { status: 'installed' };
  const installed = { ...business, carWash: { ...operation, detailing: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
