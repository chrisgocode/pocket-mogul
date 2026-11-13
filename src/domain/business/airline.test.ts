import { dollars } from '@/domain/money';
import { airlineBusiness, airlineDefinition, airlineRules } from '@/domain/testAirline';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { bestNetwork, startAirlineDay } from './airline';
import { fuelForecast, fuelOn } from './airlineFuel';
import { quoteHub } from './airlineQuotes';
import { FUEL_LEVELS, NETWORKS } from './airlineRules';
import { profitPerDayCents, quoteBusinessDay } from './core';

const pricing = { definition: airlineDefinition, rules: businessRules };
const draw = { seed: 'fly', businessId: 'airline', rules: airlineRules };
const managed = { staff: { operations: 0, sales: 0, manager: 1 } };

describe('an airline at stage 1 (BUS20k)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('airline');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 110_000,
      capacity: 100_000,
      served: 100_000,
    });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('22,000,000'));
  });
});

describe('networks (BUS20k)', () => {
  it('earn the shared-core profit on Regional at Normal fuel', () => {
    expect(profitPerDayCents(airlineBusiness(), pricing)).toBe(dollars('22,000,000'));
  });

  it('fly fewer seats at a higher fare and fuel burn as routes get longer', () => {
    expect(quoteBusinessDay(airlineBusiness({ network: 'mixed' }), pricing)).toMatchObject({
      capacity: 81_250,
      priceCents: dollars('498.60'),
      costPerServedCents: dollars('139.44'),
      profitCents: dollars('23,581,750'),
    });
    const long = airlineBusiness({ network: 'intercontinental' });
    expect(quoteBusinessDay(long, pricing)).toMatchObject({
      capacity: 64_750,
      priceCents: dollars('649.80'),
      costPerServedCents: dollars('215.04'),
    });
  });

  it('pay by the fuel price: long haul when cheap, short haul when expensive', () => {
    const best = FUEL_LEVELS.map((fuel) => bestNetwork(airlineBusiness({ fuel }), pricing));
    expect(best).toEqual(['intercontinental', 'mixed', 'regional']);
    const expensive = NETWORKS.map((network) =>
      profitPerDayCents(airlineBusiness({ fuel: 'expensive', network }), pricing),
    );
    expect(expensive).toEqual([
      dollars('15,280,000'),
      dollars('14,518,312.50'),
      dollars('11,411,767.50'),
    ]);
  });

  it('cost seats for the rest of the day when the fleet repositions', () => {
    const moving = airlineBusiness({ network: 'mixed', fleet: 'repositioning' });
    expect(quoteBusinessDay(moving, pricing).capacity).toBe(56_870);
    const next = startAirlineDay(moving, { pricing, seed: 'fly', day: 1 });
    expect(next.airline).toMatchObject({ fleet: 'flying', network: 'mixed' });
  });
});

describe('fuel (BUS20k)', () => {
  it('is drawn for each day from the seed, with a two-day forecast', () => {
    expect([0, 3, 4, 7].map((day) => fuelOn(draw, day))).toEqual([
      'normal',
      'normal',
      'expensive',
      'expensive',
    ]);
    expect(fuelForecast(draw, 2)).toEqual(['normal', 'expensive']);
    expect(
      startAirlineDay(airlineBusiness(), { pricing, seed: 'fly', day: 4 }).airline,
    ).toMatchObject({ fuel: 'expensive', network: 'regional' });
  });
});

describe('the manager (BUS20k)', () => {
  it('repositions overnight to the best network for the day’s fuel, at no cost', () => {
    const days = [3, 4].map(
      (day) => startAirlineDay(airlineBusiness({}, managed), { pricing, seed: 'fly', day }).airline,
    );
    expect(days).toMatchObject([
      { network: 'mixed', fuel: 'normal', fleet: 'flying' },
      { network: 'regional', fuel: 'expensive', fleet: 'flying' },
    ]);
  });

  it('leaves the network alone while the business is closed', () => {
    const closed = airlineBusiness({}, { ...managed, status: 'closed' });
    expect(startAirlineDay(closed, { pricing, seed: 'fly', day: 3 }).airline).toMatchObject({
      network: 'regional',
    });
  });
});

describe('the international hub (BUS20k)', () => {
  it('is locked below Global', () => {
    expect(quoteHub(airlineBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('37,500,000,000'),
    });
  });

  it('adds 15 percent capacity for 150 times the purchase price', () => {
    expect(quoteHub(airlineBusiness({}, { stage: 5 }), pricing)).toEqual({
      status: 'available',
      priceCents: dollars('37,500,000,000'),
      profitCents: dollars('22,000,000'),
      nextProfitCents: dollars('24,760,000'),
    });
  });
});
