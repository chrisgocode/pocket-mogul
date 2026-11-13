import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { laundromatRulesOf, runningLaundromat } from './laundromatDemand';
import type { ActiveLaundromat } from './laundromatRules';
import type { OwnedBusiness } from './owned';

export function withLaundromatUnlocked(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): OwnedBusiness {
  const rules = laundromatRulesOf(pricing);
  if (rules === undefined || business.laundromat.status === 'active') return business;
  if (business.stage < rules.unlockStage) return business;
  const laundromat: ActiveLaundromat = {
    status: 'active',
    jumboPercent: 0,
    serviceLevel: 0,
    pickup: 'none',
  };
  return { ...business, laundromat };
}

export function withJumboShare(
  business: OwnedBusiness,
  change: { readonly operation: ActiveLaundromat; readonly jumboPercent: number },
): OwnedBusiness {
  return { ...business, laundromat: { ...change.operation, jumboPercent: change.jumboPercent } };
}

export function bestJumboShare(business: OwnedBusiness, pricing: BusinessPricing): number {
  const running = runningLaundromat(business, pricing);
  if (running === undefined) return 0;
  const { operation, rules } = running;
  const current = { share: operation.jumboPercent, profit: profitPerDayCents(business, pricing) };
  return rules.jumbo.sharePercents
    .filter((share) => share !== operation.jumboPercent)
    .reduce((best, share) => {
      const tried = withJumboShare(business, { operation, jumboPercent: share });
      const profit = profitPerDayCents(tried, pricing);
      return profit > best.profit ? { share, profit } : best;
    }, current).share;
}

export function withBestJumboShare(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): OwnedBusiness {
  const running = runningLaundromat(business, pricing);
  if (running === undefined) return business;
  const jumboPercent = bestJumboShare(business, pricing);
  return withJumboShare(business, { operation: running.operation, jumboPercent });
}
