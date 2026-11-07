import { freshGameState, type GameState } from './gameState';
import { dollars } from './money';
import { withProgress } from './progression';
import { levelZeroProperty } from './propertyQuotes';
import { ownedBusiness, propertyRules } from './testRules';

const thresholds = {
  tierUnlocks: { 2: dollars('5,000'), 3: dollars('200,000'), 4: dollars('8,000,000') },
  properties: {
    catalog: [
      {
        id: 'studio',
        price: dollars('20,000'),
        rentPerMinute: dollars('120'),
        upkeepPerMinute: dollars('20'),
        expansionAllowed: false,
      },
    ],
    rules: propertyRules,
  },
  instruments: [],
};

const holding = (cash: string, businessValue = '0', treasury = '0'): GameState => ({
  ...freshGameState({ saveId: 'test', economyVersion: 1, wallMs: 0 }),
  cashCents: dollars(cash),
  businesses: [
    ownedBusiness('vending', {
      capitalizedSpendCents: dollars(businessValue),
      treasuryCents: dollars(treasury),
    }),
  ],
});

describe('peak net worth', () => {
  it('counts cash plus business carrying value, treasury included (UX02)', () => {
    expect<bigint>(withProgress(holding('10', '250', '40'), thresholds).peakNetWorthCents).toBe(
      dollars('300'),
    );
  });

  it('adds the estimated value of each property', () => {
    const renovated = {
      ...levelZeroProperty('studio'),
      upgradeSpendCents: dollars('2,000'),
    };
    const owning = { ...holding('10', '250'), properties: [renovated] };
    expect<bigint>(withProgress(owning, thresholds).peakNetWorthCents).toBe(dollars('21,860'));
  });

  it('never falls', () => {
    const peaked = withProgress(holding('900'), thresholds);
    expect<bigint>(
      withProgress({ ...peaked, cashCents: dollars('1') }, thresholds).peakNetWorthCents,
    ).toBe(dollars('900'));
  });
});

describe('tier unlocks (BUS07)', () => {
  it('keeps Tier 2 locked until peak net worth reaches $5,000', () => {
    expect(withProgress(holding('4,000', '999.99'), thresholds).unlockedTiers).toEqual([1]);
    expect(withProgress(holding('4,000', '1,000'), thresholds).unlockedTiers).toEqual([1, 2]);
  });

  it('opens every tier the peak has passed at once', () => {
    expect(withProgress(holding('8,000,000'), thresholds).unlockedTiers).toEqual([1, 2, 3, 4]);
  });

  it('keeps a tier open after net worth falls below its threshold (AC11)', () => {
    const unlockedThenPoorer = { ...holding('10'), unlockedTiers: [1, 2] };
    expect(withProgress(unlockedThenPoorer, thresholds).unlockedTiers).toEqual([1, 2]);
  });
});
