import { dollars } from '@/domain/money';
import { hotelBusiness, hotelDefinition, hotelRules } from '@/domain/testHotel';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { bestPriceLevel, profitPerDayCents, quoteBusinessDay } from './core';
import { startHotelDay } from './hotel';
import { starRating } from './hotelDemand';
import { quoteConference } from './hotelQuotes';
import { seasonForecast, seasonOn } from './hotelSeasons';

const pricing = { definition: hotelDefinition, rules: businessRules };
const draw = { seed: 'stay', businessId: 'hotel_group', rules: hotelRules };
const housekeeper = { operations: 1, sales: 0, manager: 0 };
const plan = { low: 'value', shoulder: 'standard', high: 'premium', event: 'luxury' } as const;

const rated = (change: Parameters<typeof hotelBusiness>[1]) =>
  starRating(hotelBusiness({}, change), hotelRules);

describe('a hotel at stage 1 (BUS20i)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('hotel_group');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 8800,
      capacity: 8000,
      served: 8000,
    });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('1,200,000'));
  });
});

describe('seasons (BUS20i)', () => {
  it('move how many guests want a room', () => {
    const demand = (['low', 'shoulder', 'high', 'event'] as const).map(
      (season) => quoteBusinessDay(hotelBusiness({ season }), pricing).demand,
    );
    expect(demand).toEqual([5720, 8800, 11_880, 15_840]);
  });

  it('pay for a higher rate when the town is full', () => {
    const low = hotelBusiness({ season: 'low' });
    const event = hotelBusiness({ season: 'event' });
    expect(profitPerDayCents(low, pricing)).toBe(dollars('766,800'));
    expect(bestPriceLevel(event, pricing)).toBe('luxury');
    expect(profitPerDayCents({ ...event, priceLevel: 'luxury' }, pricing)).toBe(
      dollars('2,200,000'),
    );
  });

  it('last three days each and are the same for the same seed', () => {
    const days = [0, 2, 8, 9, 11, 15].map((day) => seasonOn(draw, day));
    expect(days).toEqual(['high', 'high', 'high', 'shoulder', 'shoulder', 'low']);
    expect(seasonOn(draw, 9)).toBe(seasonOn(draw, 10));
  });

  it('forecast the next two seasons and the days until each starts', () => {
    expect(seasonForecast(draw, 7)).toEqual([
      { season: 'shoulder', inDays: 2 },
      { season: 'shoulder', inDays: 5 },
    ]);
  });
});

describe('the rate plan (BUS20i)', () => {
  it('switches the hotel to the planned rate when a season starts', () => {
    const planned = hotelBusiness({ season: 'high', rates: plan }, { priceLevel: 'premium' });
    const same = startHotelDay(planned, { pricing, seed: 'stay', day: 8 });
    expect(same).toMatchObject({ priceLevel: 'premium', hotel: { season: 'high' } });
    const changed = startHotelDay(planned, { pricing, seed: 'stay', day: 9 });
    expect(changed).toMatchObject({ priceLevel: 'standard', hotel: { season: 'shoulder' } });
    const later = startHotelDay(changed, { pricing, seed: 'stay', day: 15 });
    expect(later).toMatchObject({ priceLevel: 'value', hotel: { season: 'low' } });
  });

  it('keeps a rate the player changes during a season until the season ends', () => {
    const adjusted = hotelBusiness({ season: 'high', rates: plan }, { priceLevel: 'luxury' });
    const next = startHotelDay(adjusted, { pricing, seed: 'stay', day: 7 });
    expect(next.priceLevel).toBe('luxury');
  });
});

describe('stars (BUS20i)', () => {
  it('come from Quality and from enough housekeepers for the room blocks', () => {
    expect(rated({})).toBe(1);
    expect(rated({ staff: housekeeper })).toBe(2);
    expect(rated({ units: 5, staff: housekeeper })).toBe(1);
    expect(rated({ levels: { quality: 12, efficiency: 0 }, staff: housekeeper })).toBe(4);
    expect(rated({ levels: { quality: 20, efficiency: 0 }, staff: housekeeper })).toBe(5);
  });

  it('raise the price every guest pays by 4 percent a star', () => {
    const twoStars = hotelBusiness({}, { staff: housekeeper });
    expect(quoteBusinessDay(hotelBusiness(), pricing).priceCents).toBe(dollars('250'));
    expect(quoteBusinessDay(twoStars, pricing).priceCents).toBe(dollars('260'));
  });
});

describe('the conference centre (BUS20i)', () => {
  it('is locked below Global', () => {
    expect(quoteConference(hotelBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('1,500,000,000'),
    });
  });

  it('adds half again to Event-season guests, quoted for an Event season', () => {
    const global = hotelBusiness({}, { stage: 5, priceLevel: 'luxury', units: 2 });
    const quote = quoteConference(global, pricing);
    expect(quote).toMatchObject({ status: 'available', priceCents: dollars('1,500,000,000') });
    const hosting = hotelBusiness(
      { season: 'event', conference: 'installed' },
      { priceLevel: 'luxury', units: 2 },
    );
    const without = hotelBusiness({ season: 'event' }, { priceLevel: 'luxury', units: 2 });
    expect(quoteBusinessDay(without, pricing).demand).toBe(13_939);
    expect(quoteBusinessDay(hosting, pricing).demand).toBe(20_908);
    expect(quote).toMatchObject({
      profitCents: profitPerDayCents(without, pricing),
      nextProfitCents: profitPerDayCents(hosting, pricing),
    });
  });

  it('changes nothing outside Event season', () => {
    const hosting = hotelBusiness({ season: 'high', conference: 'installed' });
    expect(quoteBusinessDay(hosting, pricing).demand).toBe(11_880);
  });
});
