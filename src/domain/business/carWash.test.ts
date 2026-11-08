import { dollars } from '@/domain/money';
import { carWashBusiness, carWashFlagship, carWashRules } from '@/domain/testCarWash';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { joinsPerDay, memberLimit, startCarWashDay } from './carWash';
import { packageShares, runningCarWash } from './carWashDemand';
import { forecastAfter, weatherOn } from './carWashWeather';
import { profitPerDayCents, quoteBusinessDay } from './core';

const pricing = { definition: carWashFlagship, rules: businessRules };
const draw = { seed: 'wash', businessId: 'car_wash', rules: carWashRules };

const sharesOf = (business: ReturnType<typeof carWashBusiness>) => {
  const running = runningCarWash(business, pricing);
  return running === undefined ? undefined : packageShares(running);
};

describe('a car wash at stage 1 (BUS20b)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('car_wash');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 550,
      capacity: 500,
      served: 500,
      priceCents: dollars('26'),
    });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('9,000'));
  });
});

describe('wash packages (BUS20b)', () => {
  it('splits walk-ins 60, 30 and 10 percent and counts capacity in bay time', () => {
    const quote = quoteBusinessDay(carWashBusiness(), pricing);
    expect(quote).toMatchObject({
      demand: 550,
      capacity: 495,
      served: 495,
      priceCents: dollars('26.26'),
    });
    expect(quote.profitCents).toBe(dollars('9,022.70'));
  });

  it('moves a withdrawn package’s share to the next package down', () => {
    expect(
      sharesOf(carWashBusiness({ packages: { deluxe: 'offered', ultimate: 'withdrawn' } })),
    ).toEqual({ basic: 60, deluxe: 40, ultimate: 0, detailing: 0 });
    expect(
      sharesOf(carWashBusiness({ packages: { deluxe: 'withdrawn', ultimate: 'offered' } })),
    ).toEqual({ basic: 90, deluxe: 0, ultimate: 10, detailing: 0 });
    expect(
      sharesOf(carWashBusiness({ packages: { deluxe: 'withdrawn', ultimate: 'withdrawn' } })),
    ).toEqual({ basic: 100, deluxe: 0, ultimate: 0, detailing: 0 });
  });

  it('washes more cars without Ultimate on a busy day, and earns less that way in the rain', () => {
    const lean = { packages: { deluxe: 'offered', ultimate: 'withdrawn' } } as const;
    const sunny = profitPerDayCents(carWashBusiness({ weather: 'sunny' }), pricing);
    const sunnyLean = profitPerDayCents(carWashBusiness({ ...lean, weather: 'sunny' }), pricing);
    expect([sunny, sunnyLean]).toEqual([dollars('9,022.70'), dollars('9,225.92')]);
    const rain = profitPerDayCents(carWashBusiness({ weather: 'rain' }), pricing);
    const rainLean = profitPerDayCents(carWashBusiness({ ...lean, weather: 'rain' }), pricing);
    expect([rain, rainLean]).toEqual([dollars('4,301.50'), dollars('3,944')]);
  });

  it('adds detailing as a fourth package that takes walk-ins from Basic', () => {
    const detailed = carWashBusiness({ detailing: 'installed' });
    expect(sharesOf(detailed)).toEqual({ basic: 50, deluxe: 30, ultimate: 10, detailing: 10 });
    expect(quoteBusinessDay(detailed, pricing)).toMatchObject({
      capacity: 386,
      priceCents: dollars('34.58'),
    });
  });
});

describe('weather (BUS20b, AC37)', () => {
  it('multiplies walk-in demand by 120, 100, 50 and 160 percent', () => {
    const demand = (['sunny', 'cloudy', 'rain', 'after_rain'] as const).map(
      (weather) => quoteBusinessDay(carWashBusiness({ weather }), pricing).demand,
    );
    expect(demand).toEqual([660, 550, 275, 880]);
  });

  it('draws each day’s weather from the seed, with After rain only right after Rain', () => {
    const days = Array.from({ length: 12 }, (_, day) => weatherOn(draw, day));
    expect(days).toEqual([
      'sunny',
      'cloudy',
      'sunny',
      'sunny',
      'cloudy',
      'sunny',
      'sunny',
      'cloudy',
      'rain',
      'after_rain',
      'rain',
      'after_rain',
    ]);
    expect(Array.from({ length: 12 }, (_, day) => weatherOn(draw, day))).toEqual(days);
  });

  it('forecasts the next three days', () => {
    expect(forecastAfter(draw, 7)).toEqual(['rain', 'after_rain', 'rain']);
  });
});

describe('memberships (BUS20b)', () => {
  it('charges each member a daily fee and reserves their bay time first', () => {
    const quote = quoteBusinessDay(carWashBusiness({ members: 100 }), pricing);
    expect(quote).toMatchObject({ capacity: 445, served: 445, memberFeesCents: dollars('1,200') });
    expect(quote.customerCostsCents).toBe(dollars('2,376'));
    expect(quote.profitCents).toBe(dollars('8,909.70'));
  });

  it('keeps paying whatever the weather', () => {
    const rainy = quoteBusinessDay(carWashBusiness({ members: 100, weather: 'rain' }), pricing);
    expect(rainy.memberFeesCents).toBe(dollars('1,200'));
  });

  it('joins in proportion to Quality and the membership price, up to the cap', () => {
    expect(joinsPerDay(carWashBusiness(), pricing)).toBe(20);
    expect(joinsPerDay(carWashBusiness({ membershipLevel: 'budget' }), pricing)).toBe(29);
    const better = carWashBusiness({}, { levels: { quality: 5, efficiency: 0 } });
    expect(joinsPerDay(better, pricing)).toBe(28);
    expect(memberLimit(carWashBusiness(), pricing)).toBe(200);
  });

  it('adds the day’s new members at each day boundary, stopping at the cap', () => {
    const start = { pricing, seed: 'wash', day: 1 };
    const next = startCarWashDay(carWashBusiness({ members: 190 }), start);
    expect(next.carWash).toMatchObject({ members: 200, weather: 'cloudy' });
  });

  it('lets members leave when capacity is short', () => {
    const start = { pricing, seed: 'wash', day: 1 };
    const failure = {
      status: 'active',
      incidentId: 'car_wash_equipment_failure',
      endsDay: 4,
      capacityBps: 7000,
      costBps: 10000,
    } as const;
    const next = startCarWashDay(carWashBusiness({ members: 200 }, { incident: failure }), start);
    expect(next.carWash).toMatchObject({ members: 140 });
  });

  it('has a manager raise the cap ahead of forecast rain and lower it in clear spells', () => {
    const managed = { staff: { operations: 0, sales: 0, manager: 1 } };
    const beforeRain = startCarWashDay(carWashBusiness({}, managed), {
      pricing,
      seed: 'wash',
      day: 7,
    });
    expect(beforeRain.carWash).toMatchObject({ memberCapPercent: 60 });
    const clear = startCarWashDay(carWashBusiness({ memberCapPercent: 60 }, managed), {
      pricing,
      seed: 'wash',
      day: 1,
    });
    expect(clear.carWash).toMatchObject({ memberCapPercent: 20 });
  });
});
