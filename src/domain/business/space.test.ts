import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness } from '@/domain/testRules';
import { spaceBusiness, spaceDefinition, spaceRules } from '@/domain/testSpace';

import { profitPerDayCents, quoteBusinessDay } from './core';
import { bestCadence, openPayloadOffer, startSpaceDay } from './space';
import { runningSpace } from './spaceDemand';
import { quoteBoosters } from './spaceQuotes';
import { CADENCES, LAUNCH_WEATHERS } from './spaceRules';
import { launchForecast, launchWeatherOn, payloadOfferOn } from './spaceWeather';

const pricing = { definition: spaceDefinition, rules: businessRules };
const draw = { seed: 'lift', businessId: 'space_launch', rules: spaceRules };
const managed = { staff: { operations: 0, sales: 0, manager: 1 } };
const relay = {
  clientId: 'polar_relay',
  parcelsPerDay: 20,
  rateCents: dollars('2,600,000'),
  penaltyCents: dollars('2,000,000'),
  endsDay: 9,
};

const offerFor = (business: ReturnType<typeof spaceBusiness>, day: number) => {
  const running = runningSpace(business, pricing);
  return running === undefined ? undefined : openPayloadOffer(running, { draw, day });
};

describe('a launch company at stage 1 (BUS20l)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('space_launch');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({ demand: 55, capacity: 50, served: 50 });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('60,000,000'));
  });
});

describe('launch cadence and weather (BUS20l)', () => {
  it('earns the shared-core profit on Standard on a clear day', () => {
    expect(profitPerDayCents(spaceBusiness(), pricing)).toBe(dollars('60,000,000'));
  });

  it('launches more on a faster cadence when the sky is clear', () => {
    const launched = CADENCES.map(
      (cadence) => quoteBusinessDay(spaceBusiness({ cadence }), pricing).capacity,
    );
    expect(launched).toEqual([42, 50, 62]);
  });

  it('loses more launches to a storm on a faster cadence', () => {
    const storm = CADENCES.map((cadence) =>
      quoteBusinessDay(spaceBusiness({ cadence, weather: 'storm' }), pricing),
    );
    expect(storm.map((quote) => quote.capacity)).toEqual([31, 25, 12]);
    expect(storm.map((quote) => quote.profitCents)).toEqual([
      dollars('31,120,000'),
      dollars('22,000,000'),
      dollars('2,240,000'),
    ]);
  });

  it('draws the weather for each day from the seed, with a two-day forecast', () => {
    expect([0, 2, 3, 6].map((day) => launchWeatherOn(draw, day))).toEqual([
      'clear',
      'windy',
      'storm',
      'clear',
    ]);
    expect(launchForecast(draw, 1)).toEqual(['windy', 'storm']);
  });
});

describe('payload contracts (BUS20l)', () => {
  it('launch before open-market payloads and pay their own rate', () => {
    const flying = spaceBusiness({ contracts: [relay, relay] });
    expect(quoteBusinessDay(flying, pricing)).toMatchObject({
      capacity: 10,
      contractParcels: 40,
      missedParcels: 0,
      contractRevenueCents: dollars('104,000,000'),
      profitCents: dollars('84,000,000'),
    });
  });

  it('cost the standard price for every payload a storm keeps on the ground', () => {
    const grounded = spaceBusiness({ contracts: [relay, relay], weather: 'storm' });
    expect(quoteBusinessDay(grounded, pricing)).toMatchObject({
      contractParcels: 25,
      missedParcels: 15,
      penaltiesCents: dollars('30,000,000'),
      profitCents: dollars('7,000,000'),
    });
    const careful = { ...grounded.space, cadence: 'careful' as const };
    expect(profitPerDayCents({ ...grounded, space: careful }, pricing)).toBe(dollars('31,720,000'));
  });

  it('draws one offer for each four-day period', () => {
    expect(payloadOfferOn(draw, 0)).toEqual({
      id: 0,
      clientId: 'meridian_weather',
      sizePercent: 20,
      rateBps: 11_000,
      days: 7,
    });
    expect(payloadOfferOn(draw, 3)).toEqual(payloadOfferOn(draw, 0));
    expect(payloadOfferOn(draw, 4)).toMatchObject({ id: 1, clientId: 'polar_relay' });
  });

  it('shows no offer once it is answered or the pads hold two contracts', () => {
    expect(offerFor(spaceBusiness(), 0)).toMatchObject({ id: 0 });
    expect(offerFor(spaceBusiness({ answeredOffer: 0 }), 3)).toBeUndefined();
    expect(offerFor(spaceBusiness({ answeredOffer: 0 }), 4)).toMatchObject({ id: 1 });
    expect(offerFor(spaceBusiness({ contracts: [relay, relay] }), 0)).toBeUndefined();
  });

  it('end on their last day', () => {
    const flying = spaceBusiness({ contracts: [relay] });
    const before = startSpaceDay(flying, { pricing, seed: 'lift', day: 8 });
    const after = startSpaceDay(flying, { pricing, seed: 'lift', day: 9 });
    expect(before.space).toMatchObject({ contracts: [relay] });
    expect(after.space).toMatchObject({ contracts: [] });
  });
});

describe('the manager (BUS20l)', () => {
  it('sets the most profitable cadence for the day’s weather', () => {
    const best = LAUNCH_WEATHERS.map((weather) => bestCadence(spaceBusiness({ weather }), pricing));
    expect(best).toEqual(['rapid', 'standard', 'careful']);
    const days = [1, 3].map(
      (day) => startSpaceDay(spaceBusiness({}, managed), { pricing, seed: 'lift', day }).space,
    );
    expect(days).toMatchObject([
      { weather: 'clear', cadence: 'rapid' },
      { weather: 'storm', cadence: 'careful' },
    ]);
  });

  it('leaves the cadence alone without a manager, with the new weather', () => {
    const next = startSpaceDay(spaceBusiness(), { pricing, seed: 'lift', day: 3 });
    expect(next.space).toMatchObject({ weather: 'storm', cadence: 'standard' });
  });
});

describe('reusable boosters (BUS20l)', () => {
  it('are locked below Global', () => {
    expect(quoteBoosters(spaceBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('112,500,000,000'),
    });
  });

  it('add half again to capacity for 150 times the purchase price', () => {
    const global = spaceBusiness({ cadence: 'careful' }, { stage: 5 });
    expect(quoteBoosters(global, pricing)).toEqual({
      status: 'available',
      priceCents: dollars('112,500,000,000'),
      profitCents: dollars('47,840,000'),
      nextProfitCents: dollars('67,600,000'),
    });
  });
});
