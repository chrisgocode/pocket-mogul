import type { BusinessPricing } from './definition';
import type { ContractTerms } from './deliveryState';
import type { ActiveFactory, FactoryRules } from './factoryRules';
import type { OwnedBusiness } from './owned';

export type RunningFactory = { readonly rules: FactoryRules; readonly operation: ActiveFactory };

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function factoryRulesOf(pricing: BusinessPricing): FactoryRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'factory' ? mechanic.factory : undefined;
}

export function runningFactory(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningFactory | undefined {
  const rules = factoryRulesOf(pricing);
  const operation = business.factory;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export type FactoryDay = {
  readonly demandBps: bigint;
  readonly priceBps: bigint;
  readonly costBps: bigint;
  readonly capacityBps: bigint;
  readonly memberBay: bigint;
  readonly contracts: readonly ContractTerms[];
};

export function factoryDay(running: RunningFactory): FactoryDay {
  const { rules, operation } = running;
  const product = rules.products[operation.product];
  const automated = operation.automation === 'installed';
  const saving = PERCENT - BigInt(automated ? rules.automation.costSavingPercent : 0);
  const retooling = operation.retoolDaysLeft > 0;
  return {
    demandBps: BigInt(product.demandBps),
    priceBps: BigInt(product.priceBps),
    costBps: (BigInt(product.costBps) * saving) / PERCENT,
    capacityBps: retooling ? BigInt(rules.retoolCapacityBps) : BASIS_POINTS,
    memberBay: operation.orders.reduce((total, order) => total + BigInt(order.parcelsPerDay), 0n),
    contracts: operation.orders,
  };
}
