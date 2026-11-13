import { moneyCents, type MoneyCents } from '@/domain/money';

import { bakeryRulesOf, runningBakery } from './bakeryDemand';
import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type CentralKitchenQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteCentralKitchen(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): CentralKitchenQuote | undefined {
  const rules = bakeryRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { centralKitchen } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(centralKitchen.priceMultiple));
  const running = runningBakery(business, pricing);
  if (running === undefined || business.stage < centralKitchen.stage) {
    return { status: 'locked', unlockStage: centralKitchen.stage, priceCents };
  }
  const { operation } = running;
  if (operation.centralKitchen === 'installed') return { status: 'installed' };
  const installed = {
    ...business,
    bakery: { ...operation, centralKitchen: 'installed' as const },
  };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
