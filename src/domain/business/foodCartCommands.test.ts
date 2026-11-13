import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { foodCartBusiness, foodCartDefinition, foodCartRules } from '@/domain/testFoodCart';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { applyInstallSecondWindow, applySetCartSpot, applySetMenuItem } from './foodCartCommands';
import { crowdsOn } from './foodCartCrowds';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [foodCartDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'food_cart', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'cart', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const foodCartAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.foodCart : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

describe('unlocking the food cart mechanic (BUS20d)', () => {
  it('opens at Local in the park with a short menu and the seeded crowds', () => {
    const startup = ownedBusiness('food_cart', { units: 3, treasuryCents: dollars('5,000') });
    const state = owning(startup, 8);
    const draw = { seed: state.market.seed, businessId: 'food_cart', rules: foodCartRules };
    expect(foodCartAfter(applyUpgradeStage(state, { ...order, fromStage: 1 }))).toEqual({
      status: 'active',
      spot: 'park',
      crowds: crowdsOn(draw, 8),
      menu: { combo: 'withdrawn', snacks: 'withdrawn', express: 'withdrawn' },
      secondWindow: 'none',
    });
  });

  it('opens at the next day boundary for a cart that is already Local', () => {
    const local = ownedBusiness('food_cart', { stage: 2 });
    const settled = settleBusinesses([local], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'cart',
    });
    expect(settled.businesses[0]?.foodCart).toMatchObject({ status: 'active', spot: 'park' });
  });

  it('refuses spot and menu changes below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('food_cart'));
    expect(applySetCartSpot(startup, { ...order, spot: 'market' })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(
      applySetMenuItem(vending, { businessId: 'vending', economy, item: 'combo', offered: true }),
    ).toEqual({ ok: false, error: 'UPGRADE_UNAVAILABLE' });
  });
});

describe('running the cart (BUS20d)', () => {
  it('moves the cart for free', () => {
    const result = applySetCartSpot(owning(foodCartBusiness()), { ...order, spot: 'stadium' });
    expect(foodCartAfter(result)).toMatchObject({ spot: 'stadium' });
    expect(result).toMatchObject({ ok: true, cashChangeCents: 0n });
  });

  it('adds and removes a menu item', () => {
    const state = owning(foodCartBusiness());
    const added = applySetMenuItem(state, { ...order, item: 'express', offered: true });
    expect(foodCartAfter(added)).toMatchObject({
      menu: { combo: 'withdrawn', snacks: 'withdrawn', express: 'offered' },
    });
    const removed = applySetMenuItem(
      owning(
        foodCartBusiness({ menu: { combo: 'offered', snacks: 'offered', express: 'offered' } }),
      ),
      {
        ...order,
        item: 'snacks',
        offered: false,
      },
    );
    expect(foodCartAfter(removed)).toMatchObject({
      menu: { combo: 'offered', snacks: 'withdrawn', express: 'offered' },
    });
  });

  it('draws new crowds at every day boundary and keeps the player’s spot and menu', () => {
    const parked = foodCartBusiness({
      spot: 'campus',
      menu: { combo: 'offered', snacks: 'withdrawn', express: 'withdrawn' },
    });
    const settled = settleBusinesses([parked], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'cart',
    });
    const draw = { seed: 'cart', businessId: 'food_cart', rules: foodCartRules };
    expect(settled.businesses[0]?.foodCart).toEqual({
      status: 'active',
      spot: 'campus',
      crowds: crowdsOn(draw, 1),
      menu: { combo: 'offered', snacks: 'withdrawn', express: 'withdrawn' },
      secondWindow: 'none',
    });
  });
});

describe('installing the second window (BUS20d)', () => {
  it('is locked below Global', () => {
    const local = owning(foodCartBusiness({}, { treasuryCents: dollars('500,000') }));
    expect(applyInstallSecondWindow(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = foodCartBusiness({}, { stage: 5, treasuryCents: dollars('200,000') });
    const result = applyInstallSecondWindow(owning(global), order);
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('12,500'),
      capitalizedSpendCents: dollars('188,750'),
      foodCart: { secondWindow: 'installed' },
    });
    const again = applyInstallSecondWindow(
      owning(foodCartBusiness({ secondWindow: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });

  it('needs the treasury to cover the price', () => {
    const poor = foodCartBusiness({}, { stage: 5, treasuryCents: dollars('100') });
    expect(applyInstallSecondWindow(owning(poor), order)).toEqual({
      ok: false,
      error: 'INSUFFICIENT_TREASURY',
    });
  });
});
