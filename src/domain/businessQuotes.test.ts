import type { BusinessDefinition, BusinessRules, UpgradeTrack } from './businessQuotes';
import {
  branchCount,
  managerPriceCents,
  quoteBusinessIncome,
  quoteBusinessUpgrade,
  saleProceedsCents,
  unownedBusiness,
} from './businessQuotes';
import { dollars } from './money';

const rules: BusinessRules = {
  maxTrackLevel: 20,
  upgradeWeightBps: { capacity: 2000, quality: 2500, efficiency: 1500 },
  upgradeGrowth: { numerator: 118, denominator: 100 },
  levelEffectPercent: {
    capacityRevenue: 10,
    qualityRevenue: 10,
    capacityCosts: 6,
    efficiencySaving: 2,
  },
  managerPriceMultiplier: 2,
  managerBonusBps: 1000,
  milestoneEveryLevels: 15,
  milestoneBonusBps: 1000,
  saleReturnPercent: 60,
  branchArtCapacityLevels: [5, 10, 15, 20],
};

const vending: BusinessDefinition = {
  id: 'vending',
  tier: 1,
  price: dollars('250'),
  revenuePerMinute: dollars('14'),
  costsPerMinute: dollars('4'),
};

const base = unownedBusiness('vending');
const owned = { definition: vending, rules };

describe('business income quote', () => {
  it('earns a base Vending Machine $10 per minute', () => {
    expect(quoteBusinessIncome(base, owned)).toEqual({
      revenueCents: dollars('14'),
      costsCents: dollars('4'),
      milestoneBonusBps: 0,
      managerBonusBps: 0,
      netPerMinuteCents: dollars('10'),
    });
  });
});

const levelled = (capacity: number, quality: number, efficiency: number) => ({
  ...base,
  levels: { capacity, quality, efficiency },
});

describe('business bonuses', () => {
  it('adds 10% net profit for every 15 total upgrade levels (BUS04)', () => {
    expect(quoteBusinessIncome(levelled(5, 5, 4), owned).milestoneBonusBps).toBe(0);
    expect(quoteBusinessIncome(levelled(5, 5, 5), owned)).toEqual({
      revenueCents: dollars('31.50'),
      costsCents: dollars('4.68'),
      milestoneBonusBps: 1000,
      managerBonusBps: 0,
      netPerMinuteCents: dollars('29.50'),
    });
    expect(quoteBusinessIncome(levelled(20, 20, 20), owned).milestoneBonusBps).toBe(4000);
  });

  it('adds 10% net profit with a manager, compounding with the milestone (BUS03)', () => {
    const managed = { ...levelled(5, 5, 5), managerOwned: true };
    expect(quoteBusinessIncome({ ...base, managerOwned: true }, owned)).toMatchObject({
      managerBonusBps: 1000,
      netPerMinuteCents: dollars('11'),
    });
    expect(quoteBusinessIncome(managed, owned).netPerMinuteCents).toBe(dollars('32.45'));
  });
});

describe('business upgrade quote', () => {
  it('prices the first Capacity upgrade at $50 and nets $11.16 per minute after it (AC07)', () => {
    expect(quoteBusinessUpgrade(base, { ...owned, track: 'capacity' })).toEqual({
      status: 'available',
      track: 'capacity',
      level: 0,
      priceCents: dollars('50'),
      netPerMinuteCents: dollars('10'),
      nextNetPerMinuteCents: dollars('11.16'),
      benefitPerMinuteCents: dollars('1.16'),
    });
  });
});

const upgradeAt = (track: UpgradeTrack, level: number) =>
  quoteBusinessUpgrade(
    { ...base, levels: { ...base.levels, [track]: level } },
    { ...owned, track },
  );

describe('upgrade prices', () => {
  it.each([
    ['capacity', 1, '59'],
    ['quality', 0, '62.50'],
    ['efficiency', 0, '37.50'],
    ['efficiency', 2, '52.22'],
  ] as const)('prices %p from level %p at $%p', (track, level, price) => {
    expect(upgradeAt(track, level)).toMatchObject({
      status: 'available',
      priceCents: dollars(price),
    });
  });

  it('stops each track at level 20 (MAX_LEVEL)', () => {
    expect(upgradeAt('quality', 20)).toEqual({ status: 'max', track: 'quality', level: 20 });
  });
});

describe('manager and sale', () => {
  it('prices the manager at twice the catalog price (BUS03)', () => {
    expect(managerPriceCents(owned)).toBe(dollars('500'));
  });

  it('pays 60% of recorded purchase and upgrade spending (BUS06)', () => {
    expect(saleProceedsCents({ ...base, capitalizedSpendCents: dollars('300.01') }, rules)).toBe(
      dollars('180'),
    );
  });
});

describe('branch art', () => {
  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [14, 3],
    [15, 4],
    [20, 5],
  ])('shows %p Capacity as %p branches (BUS04)', (capacity, branches) => {
    expect(branchCount(capacity, rules)).toBe(branches);
  });
});
