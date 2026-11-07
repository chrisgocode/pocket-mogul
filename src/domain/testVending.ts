import type { BusinessDefinition } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import type { VendingRules, VendingSpot, VendingSpots } from './business/vendingRules';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

export const vendingRules: VendingRules = {
  unlockStage: 2,
  defaultMix: 'balanced',
  stockPerMachine: 300,
  matchBps: { poor: 6000, perfect: 14000 },
  locations: {
    office: {
      slots: 120,
      trafficBps: 10000,
      taste: { snacks: 40, drinks: 45, healthy: 15 },
      restockFeePerMachineCents: dollars('2'),
    },
    gym: {
      slots: 20,
      trafficBps: 11000,
      taste: { snacks: 10, drinks: 40, healthy: 50 },
      restockFeePerMachineCents: dollars('3'),
    },
    school: {
      slots: 25,
      trafficBps: 12000,
      taste: { snacks: 65, drinks: 25, healthy: 10 },
      restockFeePerMachineCents: dollars('2.50'),
    },
    station: {
      slots: 30,
      trafficBps: 14000,
      taste: { snacks: 25, drinks: 65, healthy: 10 },
      restockFeePerMachineCents: dollars('4'),
    },
    hospital: {
      slots: 20,
      trafficBps: 12500,
      taste: { snacks: 15, drinks: 25, healthy: 60 },
      restockFeePerMachineCents: dollars('3.50'),
    },
  },
  mixes: {
    snacks: { snacks: 70, drinks: 20, healthy: 10 },
    drinks: { snacks: 20, drinks: 70, healthy: 10 },
    healthy: { snacks: 10, drinks: 20, healthy: 70 },
    balanced: { snacks: 34, drinks: 33, healthy: 33 },
  },
  cardReaders: { stage: 5, priceMultiple: 150, demandPercent: 20 },
};

export const vendingFlagship: BusinessDefinition = {
  ...vendingDefinition,
  mechanic: { kind: 'vending', vending: vendingRules },
};

const EMPTY_SPOT: VendingSpot = { machines: 0, mix: 'balanced', stock: 0 };

export function vendingSpots(spots: Partial<VendingSpots>): VendingSpots {
  return {
    office: EMPTY_SPOT,
    gym: EMPTY_SPOT,
    school: EMPTY_SPOT,
    station: EMPTY_SPOT,
    hospital: EMPTY_SPOT,
    ...spots,
  };
}

export function vendingBusiness(
  spots: Partial<VendingSpots>,
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  const placed = vendingSpots(spots);
  const units = Object.values(placed).reduce((total, spot) => total + spot.machines, 0);
  return ownedBusiness('vending', {
    stage: 2,
    units,
    vending: { status: 'active', spots: placed, cardReaders: 'none' },
    ...change,
  });
}
