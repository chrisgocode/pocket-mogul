import { moneyCents, type MoneyCents } from '@/domain/money';

import { airlineRulesOf, runningAirline } from './airlineDemand';
import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type HubQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteHub(business: OwnedBusiness, pricing: BusinessPricing): HubQuote | undefined {
  const rules = airlineRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { hub } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(hub.priceMultiple));
  const running = runningAirline(business, pricing);
  if (running === undefined || business.stage < hub.stage) {
    return { status: 'locked', unlockStage: hub.stage, priceCents };
  }
  const { operation } = running;
  if (operation.hub === 'installed') return { status: 'installed' };
  const installed = { ...business, airline: { ...operation, hub: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
