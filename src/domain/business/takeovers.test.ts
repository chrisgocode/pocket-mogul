import { dollars } from '@/domain/money';
import { vendingBusiness, vendingFlagship } from '@/domain/testVending';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import type { OwnedBusiness } from './owned';
import { acceptanceChanceBps, answerTakeover } from './takeovers';
import type { Takeovers } from './takeoverState';
import { rivalValuationCents, valuationCents } from './valuation';

const pricing = { definition: vendingDefinition, rules: businessRules };
const [snackpoint, coinbright] = vendingDefinition.rivals;
const SNACKPOINT_VALUE = dollars('4,222.80');

const offering = (amountCents: bigint, change: Partial<Takeovers> = {}): Takeovers => ({
  offer: { status: 'pending', rivalId: 'snackpoint', amountCents: dollars(String(amountCents)) },
  locks: [],
  merged: [],
  ...change,
});

const regional = (takeovers: Takeovers, change: Partial<OwnedBusiness> = {}) =>
  ownedBusiness('vending', {
    stage: 3,
    units: 20,
    levels: { quality: 1, efficiency: 0 },
    treasuryCents: dollars('10,000'),
    capitalizedSpendCents: dollars('2,000'),
    takeovers,
    ...change,
  });

const answer = (business: OwnedBusiness, day = 4) =>
  answerTakeover(business, { pricing, seed: 'rivals', day });

describe('valuation (BUS18, Section 12)', () => {
  it('values a rival at 10 days of its profit with an empty treasury', () => {
    expect(rivalValuationCents(snackpoint!, pricing)).toBe(SNACKPOINT_VALUE);
    expect(rivalValuationCents(coinbright!, pricing)).toBe(dollars('12,000'));
  });

  it('adds the treasury and never counts a loss', () => {
    const owned = ownedBusiness('vending', { treasuryCents: dollars('50') });
    expect(valuationCents(owned, pricing)).toBe(dollars('1,050'));
    const leaky = { ...vendingDefinition, upkeepPerUnitCents: dollars('200') };
    expect(valuationCents(owned, { ...pricing, definition: leaky })).toBe(dollars('50'));
  });
});

describe('acceptance chance (BUS18)', () => {
  const rules = businessRules.takeovers;
  const chanceAt = (percent: bigint) =>
    acceptanceChanceBps(
      { amountCents: dollars(String(percent * 10n)), valuationCents: dollars('1,000') },
      rules,
    );

  it('rises from none at 80% of valuation to certain at 140%', () => {
    expect([70n, 80n, 95n, 110n, 125n, 140n, 160n].map(chanceAt)).toEqual([
      0, 0, 2500, 5000, 7500, 10_000, 10_000,
    ]);
  });
});

describe('answers at the day boundary (BUS18, AC40)', () => {
  it('merges an accepted rival: units above the cap, the higher quality, paid once', () => {
    const merged = answer(regional(offering(5_912n)));
    expect(merged).toMatchObject({
      units: 25,
      levels: { quality: 2 },
      treasuryCents: dollars('4,088'),
      capitalizedSpendCents: dollars('7,912'),
      takeovers: { offer: { status: 'none' }, locks: [], merged: ['snackpoint'] },
    });
    expect(answer(merged, 5)).toEqual(merged);
  });

  it('locks a rival that turns the offer down for 5 days', () => {
    const turnedDown = answer(regional(offering(3_378n)));
    expect(turnedDown).toMatchObject({
      units: 20,
      treasuryCents: dollars('10,000'),
      takeovers: { offer: { status: 'none' }, locks: [{ rivalId: 'snackpoint', untilDay: 9 }] },
    });
    expect(answer(turnedDown, 8).takeovers.locks).toHaveLength(1);
    expect(answer(turnedDown, 9).takeovers.locks).toEqual([]);
  });

  it('lets the offer lapse with no lock when the treasury can no longer pay', () => {
    const short = regional(offering(5_912n), { treasuryCents: dollars('5,000') });
    expect(answer(short)).toMatchObject({
      units: 20,
      treasuryCents: dollars('5,000'),
      takeovers: { offer: { status: 'none' }, locks: [], merged: [] },
    });
  });

  it("places a vending rival's machines at home", () => {
    const machines = vendingBusiness(
      { office: { machines: 20, mix: 'balanced', stock: 300 } },
      { stage: 3, treasuryCents: dollars('10,000'), takeovers: offering(5_912n) },
    );
    const vending = { definition: vendingFlagship, rules: businessRules };
    const merged = answerTakeover(machines, { pricing: vending, seed: 'rivals', day: 4 });
    expect(merged).toMatchObject({
      units: 25,
      vending: { spots: { office: { machines: 25 } } },
    });
  });
});
