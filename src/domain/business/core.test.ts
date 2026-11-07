import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import {
  bestPriceLevel,
  cashPerMinuteCents,
  quoteBusinessDay,
  quoteImprovement,
  quoteUnit,
  saleProceedsCents,
} from './core';

const pricing = { definition: vendingDefinition, rules: businessRules };
const vending = ownedBusiness('vending');

describe('a business day', () => {
  it('serves 100 of 110 customers at $1.40 for $100 profit at Standard (AC06)', () => {
    expect(quoteBusinessDay(vending, pricing)).toEqual({
      demand: 110,
      capacity: 100,
      served: 100,
      priceCents: dollars('1.40'),
      costPerServedCents: dollars('0.24'),
      revenueCents: dollars('140'),
      upkeepCents: dollars('16'),
      customerCostsCents: dollars('24'),
      profitCents: dollars('100'),
    });
  });

  it('earns $107.82 at Premium and marks it the best level (AC07)', () => {
    const premium = quoteBusinessDay({ ...vending, priceLevel: 'premium' }, pricing);
    expect(premium).toMatchObject({ served: 82, priceCents: dollars('1.75') });
    expect<bigint>(premium.profitCents).toBe(dollars('107.82'));
    expect(bestPriceLevel(vending, pricing)).toBe('premium');
  });

  it('earns $95.60 at Luxury', () => {
    const luxury = quoteBusinessDay({ ...vending, priceLevel: 'luxury' }, pricing);
    expect(luxury).toMatchObject({ served: 60, profitCents: dollars('95.60') });
  });

  it('adds full capacity and 60 percent of base demand with a second unit (BUS07)', () => {
    expect(quoteBusinessDay({ ...vending, units: 2 }, pricing)).toMatchObject({
      demand: 176,
      capacity: 200,
      served: 176,
    });
  });

  it('raises demand 8 percent per Quality level and cuts customer cost 3 percent per Efficiency level (BUS08)', () => {
    const improved = { ...vending, levels: { quality: 1, efficiency: 1 } };
    expect(quoteBusinessDay(improved, pricing)).toMatchObject({
      demand: 118,
      costPerServedCents: dollars('0.23'),
    });
  });

  it('pays the payout share of profit to cash per minute, and nothing while closed', () => {
    expect<bigint>(cashPerMinuteCents(vending, pricing)).toBe(dollars('5'));
    expect<bigint>(cashPerMinuteCents({ ...vending, status: 'closed' }, pricing)).toBe(0n);
  });
});

describe('growth prices', () => {
  it('prices the second unit at 40 percent of the purchase price, rising 1.15 times per unit', () => {
    expect(quoteUnit(vending, pricing)).toMatchObject({ priceCents: dollars('100'), cap: 3 });
    expect(quoteUnit({ ...vending, units: 2 }, pricing)).toMatchObject({
      priceCents: dollars('115'),
    });
  });

  it('stops at the stage cap', () => {
    expect(quoteUnit({ ...vending, units: 3 }, pricing)).toEqual({
      status: 'at_cap',
      units: 3,
      cap: 3,
    });
  });

  it('prices Quality and Efficiency on the upgrade curve', () => {
    const quality = quoteImprovement(vending, { ...pricing, track: 'quality' });
    const efficiency = quoteImprovement(vending, { ...pricing, track: 'efficiency' });
    expect(quality).toMatchObject({ priceCents: dollars('62.50') });
    expect(efficiency).toMatchObject({ priceCents: dollars('37.50') });
  });

  it('stops a track at level 20', () => {
    const maxed = { ...vending, levels: { quality: 20, efficiency: 0 } };
    expect(quoteImprovement(maxed, { ...pricing, track: 'quality' })).toEqual({
      status: 'max',
      track: 'quality',
      level: 20,
    });
  });
});

describe('selling a business', () => {
  it('pays 60 percent of its spending plus its whole treasury', () => {
    const owned = ownedBusiness('vending', {
      capitalizedSpendCents: dollars('350'),
      treasuryCents: dollars('40'),
    });
    expect<bigint>(saleProceedsCents(owned, businessRules)).toBe(dollars('250'));
  });
});
