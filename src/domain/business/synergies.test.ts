import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { quoteBusinessDay } from './core';
import type { BusinessDefinition } from './definition';
import { activeSynergies } from './synergies';
import { settleBusinesses } from './treasury';

const DAY_MS = businessRules.dayMs;

const vending: BusinessDefinition = {
  ...vendingDefinition,
  synergies: [
    { id: 'more_room', partnerId: 'laundromat', effect: 'capacity', percent: 10 },
    { id: 'more_crowd', partnerId: 'laundromat', effect: 'demand', percent: 20 },
    { id: 'cheaper_stock', partnerId: 'bakery', effect: 'cost', percent: 50 },
  ],
};
const laundromat: BusinessDefinition = { ...vendingDefinition, id: 'laundromat', synergies: [] };
const economy = { catalog: [vending, laundromat], rules: businessRules };
const pricing = { definition: vending, rules: businessRules };

const settle = (businesses: Parameters<typeof settleBusinesses>[0], elapsedMs: number) =>
  settleBusinesses(businesses, { fromMs: 0, elapsedMs, economy, seed: 'pair' }).businesses;

describe('business synergies (BUS21)', () => {
  it('starts at the day boundary after both businesses are owned', () => {
    const pair = [ownedBusiness('vending'), ownedBusiness('laundromat')];
    expect(settle(pair, DAY_MS - 1)[0]?.synergies).toEqual([]);
    expect(settle(pair, DAY_MS)[0]?.synergies).toEqual(['more_room', 'more_crowd']);
  });

  it('ends at the day boundary after the partner is gone', () => {
    const alone = [ownedBusiness('vending', { synergies: ['more_room', 'more_crowd'] })];
    expect(settle(alone, DAY_MS - 1)[0]?.synergies).toEqual(['more_room', 'more_crowd']);
    expect(settle(alone, DAY_MS)[0]?.synergies).toEqual([]);
  });

  it('leaves a business without active synergies on its own figures', () => {
    expect(quoteBusinessDay(ownedBusiness('vending'), pricing)).toMatchObject({
      demand: 110,
      capacity: 100,
      costPerServedCents: dollars('0.24'),
      profitCents: dollars('100'),
    });
  });

  it('raises customers and capacity and lowers the cost per customer while active', () => {
    const helped = ownedBusiness('vending', {
      synergies: ['more_room', 'more_crowd', 'cheaper_stock'],
    });
    expect(activeSynergies(helped, pricing).map((synergy) => synergy.id)).toEqual([
      'more_room',
      'more_crowd',
      'cheaper_stock',
    ]);
    expect(quoteBusinessDay(helped, pricing)).toMatchObject({
      demand: 132,
      capacity: 110,
      served: 110,
      costPerServedCents: dollars('0.12'),
      profitCents: dollars('124.80'),
    });
  });

  it('ignores a saved synergy the economy no longer has', () => {
    const stale = ownedBusiness('vending', { synergies: ['retired_link'] });
    expect(quoteBusinessDay(stale, pricing).profitCents).toBe(dollars('100'));
  });
});
