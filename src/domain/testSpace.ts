import type { BusinessDefinition } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import type { ActiveSpace, SpaceRules } from './business/spaceRules';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

const CONTRACT_SIZES = { small: 20, medium: 30, large: 40 };

export const spaceRules: SpaceRules = {
  unlockStage: 2,
  defaultCadence: 'standard',
  weatherChanceBps: { clear: 6500, windy: 2500, storm: 1000 },
  forecastDays: 2,
  cadences: {
    careful: { capacityBps: 8500, launchedBps: { clear: 10000, windy: 10000, storm: 7500 } },
    standard: { capacityBps: 10000, launchedBps: { clear: 10000, windy: 8500, storm: 5000 } },
    rapid: { capacityBps: 12500, launchedBps: { clear: 10000, windy: 6000, storm: 2000 } },
  },
  payloads: {
    offerDays: 4,
    maxContracts: 2,
    clients: [
      { id: 'meridian_weather', name: 'Meridian Weather Service' },
      { id: 'polar_relay', name: 'Polar Relay Networks' },
    ],
    sizePercents: Object.values(CONTRACT_SIZES),
    rateBps: { min: 11000, max: 15000 },
    penaltyBps: 10000,
    days: { min: 4, max: 8 },
  },
  boosters: { stage: 5, priceMultiple: 150, capacityPercent: 50 },
};

export const spaceDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'space_launch',
  tier: 4,
  price: dollars('750,000,000'),
  pricePerCustomerCents: dollars('2,000,000'),
  capacityPerUnit: 50,
  baseDemand: 55,
  costPerCustomerCents: dollars('480,000'),
  upkeepPerUnitCents: dollars('16,000,000'),
  catalogRevenuePerDayCents: dollars('100,000,000'),
  incidents: [],
  mechanic: { kind: 'space', space: spaceRules },
};

const openSpace: ActiveSpace = {
  status: 'active',
  cadence: 'standard',
  weather: 'clear',
  contracts: [],
  answeredOffer: -1,
  boosters: 'none',
};

export function spaceBusiness(
  space: Partial<ActiveSpace> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('space_launch', {
    stage: 2,
    capitalizedSpendCents: dollars('750,000,000'),
    space: { ...openSpace, ...space },
    ...change,
  });
}
