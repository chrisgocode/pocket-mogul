import type { ActiveBakery, BakeryRules, WholesaleOrder } from './bakeryRules';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type RunningBakery = { readonly rules: BakeryRules; readonly operation: ActiveBakery };

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function bakeryRulesOf(pricing: BusinessPricing): BakeryRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'bakery' ? mechanic.bakery : undefined;
}

export function runningBakery(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningBakery | undefined {
  const rules = bakeryRulesOf(pricing);
  const operation = business.bakery;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function wholesaleFeeCents(order: WholesaleOrder, pricing: BusinessPricing): bigint {
  const price = pricing.definition.pricePerCustomerCents;
  return (BigInt(order.ordersPerDay) * price * BigInt(order.priceBps)) / BASIS_POINTS;
}

export type BakeryDay = {
  readonly capacityBps: bigint;
  readonly unsoldCostBps: bigint;
  readonly memberBay: bigint;
  readonly memberFeesCents: bigint;
};

export function bakeryDay(running: RunningBakery, pricing: BusinessPricing): BakeryDay {
  const { rules, operation } = running;
  const installed = operation.centralKitchen === 'installed';
  const kitchen = PERCENT + BigInt(installed ? rules.centralKitchen.capacityPercent : 0);
  return {
    capacityBps: BigInt(operation.bakePercent) * kitchen,
    unsoldCostBps: BigInt(rules.staleCostBps),
    memberBay: operation.orders.reduce((total, order) => total + BigInt(order.ordersPerDay), 0n),
    memberFeesCents: operation.orders.reduce(
      (total, order) => total + wholesaleFeeCents(order, pricing),
      0n,
    ),
  };
}
