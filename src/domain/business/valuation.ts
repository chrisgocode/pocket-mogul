import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { newBusiness, type OwnedBusiness } from './owned';
import type { Rival } from './takeoverState';

export function valuationCents(business: OwnedBusiness, pricing: BusinessPricing): MoneyCents {
  const profit = profitPerDayCents(business, pricing);
  const earning = profit > 0n ? profit : 0n;
  return moneyCents(earning * BigInt(pricing.rules.sectorMultipleDays) + business.treasuryCents);
}

function rivalBusiness(rival: Rival, pricing: BusinessPricing): OwnedBusiness {
  const opened = newBusiness(pricing.definition, { rules: pricing.rules, atMs: 0 });
  return { ...opened, units: rival.units, levels: { ...opened.levels, quality: rival.quality } };
}

export function rivalValuationCents(rival: Rival, pricing: BusinessPricing): MoneyCents {
  return valuationCents(rivalBusiness(rival, pricing), pricing);
}
