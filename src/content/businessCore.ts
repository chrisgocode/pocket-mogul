import type { BusinessDefinition } from '@/domain/business/definition';
import { SHARED_CORE, type BusinessMechanic } from '@/domain/business/mechanicRules';
import { moneyCents } from '@/domain/money';

import type { Business, BusinessContentRules } from './schema';

const PERCENT = 100n;

type CoreFigures = {
  readonly capacityPerUnit: bigint;
  readonly baseDemand: bigint;
  readonly customerCostsPerDay: bigint;
  readonly costPerCustomer: bigint;
  readonly upkeepPerUnit: bigint;
};

function coreFigures(business: Business, rules: BusinessContentRules): CoreFigures {
  const capacityPerUnit = business.revenuePerDay / business.pricePerCustomer;
  const customerCostsPerDay =
    (business.costsPerDay * BigInt(rules.costPerCustomerPercent)) / PERCENT;
  return {
    capacityPerUnit,
    baseDemand: (capacityPerUnit * BigInt(rules.baseDemandPercent)) / PERCENT,
    customerCostsPerDay,
    costPerCustomer: capacityPerUnit === 0n ? 0n : customerCostsPerDay / capacityPerUnit,
    upkeepPerUnit: business.costsPerDay - customerCostsPerDay,
  };
}

function mechanicOf(business: Business): BusinessMechanic {
  const { mechanic } = business;
  if (mechanic === undefined) return SHARED_CORE;
  if (mechanic.kind === 'car_wash') {
    const { kind: _kind, ...carWash } = mechanic;
    return { kind: 'car_wash', carWash };
  }
  const { kind: _kind, ...vending } = mechanic;
  return { kind: 'vending', vending };
}

export function businessDefinition(
  business: Business,
  rules: BusinessContentRules,
): BusinessDefinition {
  const figures = coreFigures(business, rules);
  return {
    id: business.id,
    tier: business.tier,
    price: business.price,
    pricePerCustomerCents: business.pricePerCustomer,
    capacityPerUnit: Number(figures.capacityPerUnit),
    baseDemand: Number(figures.baseDemand),
    costPerCustomerCents: moneyCents(figures.costPerCustomer),
    upkeepPerUnitCents: moneyCents(figures.upkeepPerUnit),
    catalogRevenuePerDayCents: business.revenuePerDay,
    demandBps: business.demandResponseBps ?? rules.demandBps,
    incidents: business.incidents,
    mechanic: mechanicOf(business),
  };
}

export function inexactCoreFigures(business: Business, rules: BusinessContentRules): string[] {
  const figures = coreFigures(business, rules);
  return [
    business.revenuePerDay % business.pricePerCustomer !== 0n && 'capacity per unit',
    (figures.capacityPerUnit * BigInt(rules.baseDemandPercent)) % PERCENT !== 0n && 'base demand',
    (business.costsPerDay * BigInt(rules.costPerCustomerPercent)) % PERCENT !== 0n &&
      'customer costs',
    (figures.capacityPerUnit === 0n ||
      figures.customerCostsPerDay % figures.capacityPerUnit !== 0n) &&
      'cost per customer',
  ].filter((figure) => figure !== false);
}
