import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { hotelBusiness, hotelDefinition, hotelRules } from '@/domain/testHotel';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { applySetPriceLevel } from './commands';
import { applyUpgradeStage } from './growthCommands';
import { applyInstallConference, applySetSeasonRate } from './hotelCommands';
import { seasonOn } from './hotelSeasons';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [hotelDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'hotel_group', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'stay', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

describe('unlocking the hotel mechanic (BUS20i)', () => {
  it('opens at Local in the seeded season with every rate at the current price', () => {
    const startup = ownedBusiness('hotel_group', {
      units: 3,
      priceLevel: 'premium',
      treasuryCents: dollars('25,000,000'),
    });
    const state = owning(startup, 8);
    const draw = { seed: state.market.seed, businessId: 'hotel_group', rules: hotelRules };
    const result = applyUpgradeStage(state, { ...order, fromStage: 1 });
    expect(businessAfter(result)?.hotel).toEqual({
      status: 'active',
      season: seasonOn(draw, 8),
      rates: { low: 'premium', shoulder: 'premium', high: 'premium', event: 'premium' },
      conference: 'none',
    });
  });

  it('opens at the next day boundary for a hotel that is already Local', () => {
    const local = ownedBusiness('hotel_group', { stage: 2 });
    const settled = settleBusinesses([local], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'stay',
    });
    expect(settled.businesses[0]?.hotel).toMatchObject({ status: 'active', season: 'high' });
  });

  it('refuses a rate plan below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('hotel_group'));
    const change = { season: 'low', priceLevel: 'value' } as const;
    expect(applySetSeasonRate(startup, { ...order, ...change })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetSeasonRate(vending, { businessId: 'vending', economy, ...change })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('planning rates (BUS20i)', () => {
  it('plans another season without touching today’s price', () => {
    const state = owning(hotelBusiness({ season: 'shoulder' }));
    const result = applySetSeasonRate(state, { ...order, season: 'event', priceLevel: 'luxury' });
    expect(businessAfter(result)).toMatchObject({
      priceLevel: 'standard',
      hotel: { rates: { event: 'luxury', shoulder: 'standard' } },
    });
  });

  it('applies a new rate for the season in progress at once', () => {
    const state = owning(hotelBusiness({ season: 'shoulder' }));
    const result = applySetSeasonRate(state, {
      ...order,
      season: 'shoulder',
      priceLevel: 'premium',
    });
    expect(businessAfter(result)).toMatchObject({
      priceLevel: 'premium',
      hotel: { rates: { shoulder: 'premium' } },
    });
  });

  it('records a price set from the Price card as this season’s planned rate', () => {
    const state = owning(hotelBusiness({ season: 'high' }));
    const result = applySetPriceLevel(state, { ...order, priceLevel: 'luxury' });
    expect(businessAfter(result)).toMatchObject({
      priceLevel: 'luxury',
      hotel: { rates: { high: 'luxury', low: 'standard' } },
    });
  });
});

describe('installing the conference centre (BUS20i)', () => {
  it('is locked below Global', () => {
    const local = owning(hotelBusiness({}, { treasuryCents: dollars('2,000,000,000') }));
    expect(applyInstallConference(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = hotelBusiness({}, { stage: 5, treasuryCents: dollars('1,600,000,000') });
    expect(businessAfter(applyInstallConference(owning(global), order))).toMatchObject({
      treasuryCents: dollars('100,000,000'),
      capitalizedSpendCents: dollars('1,510,000,000'),
      hotel: { conference: 'installed' },
    });
    const again = applyInstallConference(
      owning(hotelBusiness({ conference: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
