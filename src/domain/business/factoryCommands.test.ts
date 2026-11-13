import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { factoryBusiness, factoryDefinition, factoryRules } from '@/domain/testFactory';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { applyAnswerBulkOffer, applyInstallAutomation, applySetProduct } from './factoryCommands';
import { bulkOfferOn } from './factoryOffers';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [factoryDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'manufacturer', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'make', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const factoryAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.factory : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const offerIn = (state: GameState, day: number) =>
  bulkOfferOn({ seed: state.market.seed, businessId: 'manufacturer', rules: factoryRules }, day);

describe('unlocking the factory mechanic (BUS20j)', () => {
  it('opens at Local on the Standard product with no orders', () => {
    const startup = ownedBusiness('manufacturer', {
      units: 3,
      treasuryCents: dollars('120,000,000'),
    });
    const result = applyUpgradeStage(owning(startup, 8), { ...order, fromStage: 1 });
    expect(factoryAfter(result)).toEqual({
      status: 'active',
      product: 'standard',
      retoolDaysLeft: 0,
      orders: [],
      answeredOffer: -1,
      automation: 'none',
    });
  });

  it('opens at the next day boundary for a factory that is already Local', () => {
    const local = ownedBusiness('manufacturer', { stage: 2 });
    const settled = settleBusinesses([local], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'make',
    });
    expect(settled.businesses[0]?.factory).toMatchObject({ status: 'active' });
  });

  it('refuses changes below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('manufacturer'));
    expect(applySetProduct(startup, { ...order, product: 'custom' })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetProduct(vending, { businessId: 'vending', economy, product: 'custom' })).toEqual(
      { ok: false, error: 'UPGRADE_UNAVAILABLE' },
    );
  });
});

describe('running the factory (BUS20j)', () => {
  it('switches product and starts retooling for the rest of today and tomorrow', () => {
    const state = owning(factoryBusiness());
    expect(factoryAfter(applySetProduct(state, { ...order, product: 'precision' }))).toMatchObject({
      product: 'precision',
      retoolDaysLeft: 2,
    });
  });

  it('refuses to switch to the product already on the lines', () => {
    const state = owning(factoryBusiness());
    expect(applySetProduct(state, { ...order, product: 'standard' })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('accepts the open offer as a bulk order sized to the lines, with its rate and penalty', () => {
    const state = owning(factoryBusiness({}, { units: 2 }), 3);
    const offer = offerIn(state, 3);
    const result = applyAnswerBulkOffer(state, { ...order, offerId: offer.id, answer: 'accept' });
    expect(factoryAfter(result)).toMatchObject({
      answeredOffer: offer.id,
      orders: [
        {
          clientId: offer.clientId,
          parcelsPerDay: 32 * offer.sizePercent,
          rateCents: BigInt(offer.rateBps) * 50n,
          penaltyCents: dollars('2,500'),
          endsDay: 3 + offer.days,
        },
      ],
    });
  });

  it('declines an offer without taking an order, and refuses a stale one', () => {
    const state = owning(factoryBusiness(), 3);
    const offer = offerIn(state, 3);
    const declined = applyAnswerBulkOffer(state, {
      ...order,
      offerId: offer.id,
      answer: 'decline',
    });
    expect(factoryAfter(declined)).toMatchObject({ answeredOffer: offer.id, orders: [] });
    expect(applyAnswerBulkOffer(state, { ...order, offerId: 99, answer: 'accept' })).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });
});

describe('installing automation (BUS20j)', () => {
  it('is locked below Global', () => {
    const local = owning(factoryBusiness({}, { treasuryCents: dollars('8,000,000,000') }));
    expect(applyInstallAutomation(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = factoryBusiness({}, { stage: 5, treasuryCents: dollars('8,000,000,000') });
    expect(businessAfter(applyInstallAutomation(owning(global), order))).toMatchObject({
      treasuryCents: dollars('500,000,000'),
      capitalizedSpendCents: dollars('7,550,000,000'),
      factory: { automation: 'installed' },
    });
    const again = applyInstallAutomation(
      owning(factoryBusiness({ automation: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
