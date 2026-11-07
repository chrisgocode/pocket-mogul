import type { BusinessDefinition } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import { freshGameState, type GameState } from './gameState';
import { dollars, moneyCents } from './money';
import { advanceTime, type PassiveEconomy } from './passiveIncome';
import { businessRules, ownedBusiness, propertyRules, vendingDefinition } from './testRules';

const ONE_SECOND_MS = 1_000;
const ONE_MINUTE_MS = 60_000;
const BUSINESS_DAY_MS = 600_000;

const pennyStand: BusinessDefinition = {
  ...vendingDefinition,
  id: 'penny_stand',
  pricePerCustomerCents: moneyCents(1),
  capacityPerUnit: 1,
  baseDemand: 1,
  costPerCustomerCents: moneyCents(0),
  upkeepPerUnitCents: moneyCents(0),
};

const leakyStand: BusinessDefinition = {
  ...vendingDefinition,
  id: 'leaky_stand',
  upkeepPerUnitCents: dollars('132'),
};

const economy: PassiveEconomy = {
  businesses: { catalog: [vendingDefinition, pennyStand, leakyStand], rules: businessRules },
  properties: { catalog: [], rules: propertyRules },
  dividendRates: {},
};

function owning(...businesses: OwnedBusiness[]): GameState {
  return { ...freshGameState({ saveId: 'test', economyVersion: 1, wallMs: 0 }), businesses };
}

const advanced = (state: GameState, elapsedMs: number) =>
  advanceTime(state, { elapsedMs, wallMs: 0, economy });

const advance = (state: GameState, elapsedMs: number) => advanced(state, elapsedMs).state;

const treasuryOf = (state: GameState): bigint => state.businesses[0]?.treasuryCents ?? -1n;

describe('treasury settlement', () => {
  it('splits a base Vending Machine day into $50 cash and $50 treasury (AC06)', () => {
    const after = advance(owning(ownedBusiness('vending')), BUSINESS_DAY_MS);
    expect<bigint>(after.cashCents).toBe(dollars('50'));
    expect(treasuryOf(after)).toBe(dollars('50'));
    expect<bigint>(after.income.businessEarningsCents).toBe(dollars('50'));
  });

  it('settles sixty one-second advances the same as one sixty-second advance (AC08)', () => {
    const start = owning(ownedBusiness('vending'));
    const stepped = Array.from({ length: 60 }).reduce<GameState>(
      (state) => advance(state, ONE_SECOND_MS),
      start,
    );
    const whole = advance(start, ONE_MINUTE_MS);
    expect<bigint>(stepped.cashCents).toBe(dollars('5'));
    expect(stepped.businesses).toEqual(whole.businesses);
    expect(stepped.income).toEqual(whole.income);
  });

  it('keeps a sub-cent remainder in the business until it adds up to a cent', () => {
    const halfway = advance(owning(ownedBusiness('penny_stand')), BUSINESS_DAY_MS / 2);
    expect(halfway.businesses[0]).toMatchObject({ treasuryCents: 0n, profitRemainder: 300_000 });
    const day = advance(halfway, BUSINESS_DAY_MS / 2);
    expect(day.businesses[0]).toMatchObject({ treasuryCents: 1n, payoutRemainder: 50 });
    expect<bigint>(advance(day, BUSINESS_DAY_MS).cashCents).toBe(moneyCents(1));
  });

  it('pays everything to cash at 100 percent and keeps everything at 0 percent', () => {
    const all = advance(owning(ownedBusiness('vending', { payoutPercent: 100 })), BUSINESS_DAY_MS);
    const none = advance(owning(ownedBusiness('vending', { payoutPercent: 0 })), BUSINESS_DAY_MS);
    expect([all.cashCents, treasuryOf(all)]).toEqual([dollars('100'), 0n]);
    expect([none.cashCents, treasuryOf(none)]).toEqual([0n, dollars('100')]);
  });

  it('moves the simulation clock and the wall checkpoint', () => {
    const after = advanceTime(owning(), { elapsedMs: 5_000, wallMs: 42, economy }).state;
    expect(after.clock).toEqual({ simulationMs: 5_000, lastWallCheckpointMs: 42 });
  });
});

const losing = () => owning(ownedBusiness('leaky_stand', { treasuryCents: dollars('10') }));

describe('a loss larger than the treasury (AC36)', () => {
  it('closes the business at the exact moment its treasury reaches zero', () => {
    const result = advanced(losing(), BUSINESS_DAY_MS);
    expect(result.closures).toEqual([{ businessId: 'leaky_stand', atMs: 375_000 }]);
    expect(result.state.businesses[0]).toMatchObject({ status: 'closed', treasuryCents: 0n });
  });

  it('never takes personal cash', () => {
    const after = advance({ ...losing(), cashCents: dollars('1,000') }, BUSINESS_DAY_MS);
    expect<bigint>(after.cashCents).toBe(dollars('1,000'));
  });

  it('closes at the same moment when time arrives in small steps', () => {
    const stepped = Array.from({ length: 10 }).reduce<{ state: GameState; atMs: number[] }>(
      (run) => {
        const next = advanced(run.state, ONE_MINUTE_MS);
        return { state: next.state, atMs: [...run.atMs, ...next.closures.map((c) => c.atMs)] };
      },
      { state: losing(), atMs: [] },
    );
    expect(stepped.atMs).toEqual([375_000]);
  });

  it('takes the loss from the treasury before it runs out', () => {
    const after = advance(losing(), ONE_MINUTE_MS);
    expect(after.businesses[0]).toMatchObject({ status: 'open', treasuryCents: dollars('8.40') });
  });

  it('earns and pays nothing while closed', () => {
    const closed = owning(ownedBusiness('vending', { status: 'closed' }));
    const after = advance(closed, BUSINESS_DAY_MS);
    expect(after.businesses).toEqual(closed.businesses);
    expect<bigint>(after.cashCents).toBe(0n);
  });
});
