import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { runningVending, vendingRulesOf } from './vendingDemand';

export type CardReaderQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteCardReaders(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): CardReaderQuote | undefined {
  const rules = vendingRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { cardReaders } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(cardReaders.priceMultiple));
  const running = runningVending(business, pricing);
  if (running === undefined || business.stage < cardReaders.stage) {
    return { status: 'locked', unlockStage: cardReaders.stage, priceCents };
  }
  const { operation } = running;
  if (operation.cardReaders === 'installed') return { status: 'installed' };
  const installed = { ...business, vending: { ...operation, cardReaders: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
