import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { laundromatRulesOf, runningLaundromat } from './laundromatDemand';
import type { OwnedBusiness } from './owned';

export type PickupQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quotePickup(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): PickupQuote | undefined {
  const rules = laundromatRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { pickup } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(pickup.priceMultiple));
  const running = runningLaundromat(business, pricing);
  if (running === undefined || business.stage < pickup.stage) {
    return { status: 'locked', unlockStage: pickup.stage, priceCents };
  }
  const { operation } = running;
  if (operation.pickup === 'installed') return { status: 'installed' };
  const installed = { ...business, laundromat: { ...operation, pickup: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
