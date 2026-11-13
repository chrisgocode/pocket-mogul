import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { factoryRulesOf, runningFactory } from './factoryDemand';
import type { OwnedBusiness } from './owned';

export type AutomationQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteAutomation(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): AutomationQuote | undefined {
  const rules = factoryRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { automation } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(automation.priceMultiple));
  const running = runningFactory(business, pricing);
  if (running === undefined || business.stage < automation.stage) {
    return { status: 'locked', unlockStage: automation.stage, priceCents };
  }
  const { operation } = running;
  if (operation.automation === 'installed') return { status: 'installed' };
  const installed = { ...business, factory: { ...operation, automation: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
