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

type ContentMechanic = NonNullable<Business['mechanic']>;
type Kind = ContentMechanic['kind'];
type MechanicOf<Each extends Kind> = Extract<ContentMechanic, { kind: Each }>;

const MECHANICS: {
  readonly [Each in Kind]: (mechanic: MechanicOf<Each>) => BusinessMechanic;
} = {
  vending: ({ kind, ...vending }) => ({ kind, vending }),
  car_wash: ({ kind, ...carWash }) => ({ kind, carWash }),
  delivery: ({ kind, ...delivery }) => ({ kind, delivery }),
  food_cart: ({ kind, ...foodCart }) => ({ kind, foodCart }),
  coffee_kiosk: ({ kind, ...coffeeKiosk }) => ({ kind, coffeeKiosk }),
  laundromat: ({ kind, ...laundromat }) => ({ kind, laundromat }),
  bakery: ({ kind, ...bakery }) => ({ kind, bakery }),
  gym: ({ kind, ...gym }) => ({ kind, gym }),
  hotel: ({ kind, ...hotel }) => ({ kind, hotel }),
};

function domainMechanic<Each extends Kind>(mechanic: MechanicOf<Each>): BusinessMechanic {
  const convert: (mechanic: MechanicOf<Each>) => BusinessMechanic = MECHANICS[mechanic.kind];
  return convert(mechanic);
}

function mechanicOf(business: Business): BusinessMechanic {
  return business.mechanic === undefined ? SHARED_CORE : domainMechanic(business.mechanic);
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
    rivals: business.rivals.map(({ id, units, quality }) => ({ id, units, quality })),
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
