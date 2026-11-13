import type { BusinessDefinition } from './business/definition';
import type { ActiveGym, GymRules } from './business/gymRules';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

const gymRules: GymRules = {
  unlockStage: 2,
  defaultTier: 'basic',
  joinsPerUnit: 300,
  visitBps: 5000,
  tiers: {
    basic: { feeCents: dollars('3'), churnBps: 300 },
    plus: { feeCents: dollars('4.50'), churnBps: 500 },
    elite: { feeCents: dollars('6.50'), churnBps: 800 },
  },
  classes: { maxLevel: 3, churnCutBps: 50, studioPercent: 3 },
  allHours: { stage: 5, priceMultiple: 150, capacityPercent: 20 },
};

export const gymDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'gym_chain',
  tier: 3,
  price: dollars('1,000,000'),
  pricePerCustomerCents: dollars('15'),
  capacityPerUnit: 20000,
  baseDemand: 22000,
  costPerCustomerCents: dollars('3'),
  upkeepPerUnitCents: dollars('40,000'),
  catalogRevenuePerDayCents: dollars('300,000'),
  incidents: [],
  mechanic: { kind: 'gym', gym: gymRules },
};

const openGym: ActiveGym = {
  status: 'active',
  members: 0,
  tier: 'basic',
  classLevel: 0,
  allHours: 'none',
};

export function gymBusiness(
  gym: Partial<ActiveGym> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('gym_chain', {
    stage: 2,
    capitalizedSpendCents: dollars('1,000,000'),
    gym: { ...openGym, ...gym },
    ...change,
  });
}
