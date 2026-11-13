import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { foodCartRulesOf, runningFoodCart } from './foodCartDemand';
import type { OwnedBusiness } from './owned';

export type SecondWindowQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteSecondWindow(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): SecondWindowQuote | undefined {
  const rules = foodCartRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { secondWindow } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(secondWindow.priceMultiple));
  const running = runningFoodCart(business, pricing);
  if (running === undefined || business.stage < secondWindow.stage) {
    return { status: 'locked', unlockStage: secondWindow.stage, priceCents };
  }
  const { operation } = running;
  if (operation.secondWindow === 'installed') return { status: 'installed' };
  const installed = {
    ...business,
    foodCart: { ...operation, secondWindow: 'installed' as const },
  };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
