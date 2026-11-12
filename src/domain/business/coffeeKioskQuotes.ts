import { moneyCents, type MoneyCents } from '@/domain/money';

import { coffeeKioskRulesOf, runningCoffeeKiosk } from './coffeeKioskDemand';
import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type OrderAheadQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteOrderAhead(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): OrderAheadQuote | undefined {
  const rules = coffeeKioskRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { orderAhead } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(orderAhead.priceMultiple));
  const running = runningCoffeeKiosk(business, pricing);
  if (running === undefined || business.stage < orderAhead.stage) {
    return { status: 'locked', unlockStage: orderAhead.stage, priceCents };
  }
  const { operation } = running;
  if (operation.orderAhead === 'installed') return { status: 'installed' };
  const installed = {
    ...business,
    coffeeKiosk: { ...operation, orderAhead: 'installed' as const },
  };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
