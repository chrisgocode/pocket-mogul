import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { bakeryBusiness, bakeryDefinition, bakeryRules } from '@/domain/testBakery';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import {
  applyAnswerWholesaleOffer,
  applyInstallCentralKitchen,
  applySetBakeLevel,
} from './bakeryCommands';
import { wholesaleOfferOn } from './bakeryOffers';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [bakeryDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'bakery', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'bake', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const bakeryAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.bakery : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const offerIn = (state: GameState, day: number) =>
  wholesaleOfferOn({ seed: state.market.seed, businessId: 'bakery', rules: bakeryRules }, day);

describe('unlocking the bakery mechanic (BUS20g)', () => {
  it('opens at Local on a full bake with no orders', () => {
    const startup = ownedBusiness('bakery', { units: 3, treasuryCents: dollars('250,000') });
    const result = applyUpgradeStage(owning(startup, 8), { ...order, fromStage: 1 });
    expect(bakeryAfter(result)).toEqual({
      status: 'active',
      bakePercent: 100,
      orders: [],
      answeredOffer: -1,
      centralKitchen: 'none',
    });
  });

  it('opens at the next day boundary for a bakery that is already Local', () => {
    const local = ownedBusiness('bakery', { stage: 2 });
    const settled = settleBusinesses([local], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'bake',
    });
    expect(settled.businesses[0]?.bakery).toMatchObject({ status: 'active' });
  });

  it('refuses changes below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('bakery'));
    expect(applySetBakeLevel(startup, { ...order, percent: 80 })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetBakeLevel(vending, { businessId: 'vending', economy, percent: 80 })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('running the bakery (BUS20g)', () => {
  it('sets a bake level from the list and refuses any other', () => {
    const state = owning(bakeryBusiness());
    expect(bakeryAfter(applySetBakeLevel(state, { ...order, percent: 80 }))).toMatchObject({
      bakePercent: 80,
    });
    expect(applySetBakeLevel(state, { ...order, percent: 85 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('accepts the open offer as a standing order sized to the ovens', () => {
    const state = owning(bakeryBusiness({}, { units: 3 }), 4);
    const offer = offerIn(state, 4);
    const result = applyAnswerWholesaleOffer(state, {
      ...order,
      offerId: offer.id,
      answer: 'accept',
    });
    expect(bakeryAfter(result)).toMatchObject({
      answeredOffer: offer.id,
      orders: [
        {
          clientId: offer.clientId,
          ordersPerDay: 30 * offer.sizePercent,
          priceBps: offer.priceBps,
          endsDay: 4 + offer.days,
        },
      ],
    });
  });

  it('declines an offer without taking an order, and refuses to answer it twice', () => {
    const state = owning(bakeryBusiness(), 4);
    const offer = offerIn(state, 4);
    const declined = applyAnswerWholesaleOffer(state, {
      ...order,
      offerId: offer.id,
      answer: 'decline',
    });
    expect(bakeryAfter(declined)).toMatchObject({ answeredOffer: offer.id, orders: [] });
    const again = applyAnswerWholesaleOffer(
      owning(bakeryBusiness({ answeredOffer: offer.id }), 4),
      { ...order, offerId: offer.id, answer: 'accept' },
    );
    expect(again).toEqual({ ok: false, error: 'STALE_QUOTE' });
  });

  it('refuses an offer from another period', () => {
    const state = owning(bakeryBusiness(), 4);
    expect(applyAnswerWholesaleOffer(state, { ...order, offerId: 99, answer: 'accept' })).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });
});

describe('installing the central kitchen (BUS20g)', () => {
  it('is locked below Global', () => {
    const local = owning(bakeryBusiness({}, { treasuryCents: dollars('20,000,000') }));
    expect(applyInstallCentralKitchen(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = bakeryBusiness({}, { stage: 5, treasuryCents: dollars('16,000,000') });
    expect(businessAfter(applyInstallCentralKitchen(owning(global), order))).toMatchObject({
      treasuryCents: dollars('1,000,000'),
      capitalizedSpendCents: dollars('15,100,000'),
      bakery: { centralKitchen: 'installed' },
    });
    const again = applyInstallCentralKitchen(
      owning(bakeryBusiness({ centralKitchen: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
