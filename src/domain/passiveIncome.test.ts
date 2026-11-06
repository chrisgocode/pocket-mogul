import { freshGameState, type GameState } from './gameState';
import { dollars, moneyCents } from './money';
import type { BusinessDefinition } from './businessQuotes';
import type { BusinessEconomy } from './businesses';
import { advanceTime } from './passiveIncome';

const ONE_SECOND_MS = 1_000;
const ONE_MINUTE_MS = 60_000;

const pennyStand: BusinessDefinition = {
  id: 'penny_stand',
  tier: 1,
  price: dollars('1'),
  revenuePerMinute: moneyCents(1),
  costsPerMinute: moneyCents(0),
};

const vending: BusinessDefinition = {
  id: 'vending',
  tier: 1,
  price: dollars('250'),
  revenuePerMinute: dollars('14'),
  costsPerMinute: dollars('4'),
};

const economy: BusinessEconomy = {
  catalog: [pennyStand, vending],
  rules: {
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
  },
};

function owning(...definitions: BusinessDefinition[]): GameState {
  return {
    ...freshGameState({ saveId: 'test', economyVersion: 1, wallMs: 0 }),
    businesses: definitions.map((definition) => ({
      definitionId: definition.id,
      levels: { capacity: 0, quality: 0, efficiency: 0 },
      managerOwned: false,
      capitalizedSpendCents: definition.price,
    })),
  };
}

const advance = (state: GameState, elapsedMs: number) =>
  advanceTime(state, { elapsedMs, wallMs: 0, economy }).state;

describe('passive accrual', () => {
  it('pays a base Vending Machine exactly $10 for 60 seconds (AC06)', () => {
    const after = advance(owning(vending), ONE_MINUTE_MS);
    expect<bigint>(after.cashCents).toBe(dollars('10'));
    expect<bigint>(after.income.businessEarningsCents).toBe(dollars('10'));
  });

  it('pays sixty one-second advances the same as one sixty-second advance (AC08)', () => {
    const stepped = Array.from({ length: 60 }).reduce<GameState>(
      (state) => advance(state, ONE_SECOND_MS),
      owning(pennyStand),
    );
    const whole = advance(owning(pennyStand), ONE_MINUTE_MS);
    expect<bigint>(stepped.cashCents).toBe(moneyCents(1));
    expect<bigint>(whole.cashCents).toBe(moneyCents(1));
    expect(stepped.income).toEqual(whole.income);
  });

  it('keeps a sub-cent remainder per stream until it adds up to a cent', () => {
    const halfway = advance(owning(pennyStand), 30 * ONE_SECOND_MS);
    expect<bigint>(halfway.cashCents).toBe(moneyCents(0));
    expect(halfway.income.businessRemainders).toEqual({ penny_stand: 30 * ONE_SECOND_MS });
    expect<bigint>(advance(halfway, 30 * ONE_SECOND_MS).cashCents).toBe(moneyCents(1));
  });

  it('keeps a stream remainder that no owned business uses any more', () => {
    const withRemainder = advance(owning(pennyStand), 30 * ONE_SECOND_MS);
    const afterSale = advance({ ...withRemainder, businesses: [] }, ONE_MINUTE_MS);
    expect(afterSale.income.businessRemainders).toEqual({ penny_stand: 30 * ONE_SECOND_MS });
    expect<bigint>(afterSale.cashCents).toBe(moneyCents(0));
  });

  it('moves the simulation clock and the wall checkpoint', () => {
    const after = advanceTime(owning(), { elapsedMs: 5_000, wallMs: 42, economy }).state;
    expect(after.clock).toEqual({ simulationMs: 5_000, lastWallCheckpointMs: 42 });
  });
});
