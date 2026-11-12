import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { coffeeKioskBusiness, coffeeKioskDefinition } from '@/domain/testCoffeeKiosk';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { applyInstallOrderAhead, applySetBeanGrade, applySetRushPlan } from './coffeeKioskCommands';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [coffeeKioskDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'coffee_kiosk', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'kiosk', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const kioskAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.coffeeKiosk : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const settleDay = (business: OwnedBusiness) =>
  settleBusinesses([business], { fromMs: 0, elapsedMs: DAY_MS, economy, seed: 'kiosk' });

describe('unlocking the coffee kiosk mechanic (BUS20e)', () => {
  it('opens at Local on House beans with the Standard rush plan', () => {
    const startup = ownedBusiness('coffee_kiosk', { units: 3, treasuryCents: dollars('10,000') });
    const result = applyUpgradeStage(owning(startup, 8), { ...order, fromStage: 1 });
    expect(kioskAfter(result)).toEqual({
      status: 'active',
      grade: 'house',
      plan: 'standard',
      orderAhead: 'none',
    });
  });

  it('opens at the next day boundary for a kiosk that is already Local', () => {
    const local = ownedBusiness('coffee_kiosk', { stage: 2 });
    expect(settleDay(local).businesses[0]?.coffeeKiosk).toMatchObject({ status: 'active' });
  });

  it('refuses changes below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('coffee_kiosk'));
    expect(applySetRushPlan(startup, { ...order, plan: 'express' })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(
      applySetBeanGrade(vending, { businessId: 'vending', economy, grade: 'reserve' }),
    ).toEqual({ ok: false, error: 'UPGRADE_UNAVAILABLE' });
  });
});

describe('running the kiosk (BUS20e)', () => {
  it('changes beans and rush plan for free', () => {
    const state = owning(coffeeKioskBusiness());
    const beans = applySetBeanGrade(state, { ...order, grade: 'single_origin' });
    expect(kioskAfter(beans)).toMatchObject({ grade: 'single_origin', plan: 'standard' });
    expect(beans).toMatchObject({ ok: true, cashChangeCents: 0n });
    const plan = applySetRushPlan(state, { ...order, plan: 'prebatch' });
    expect(kioskAfter(plan)).toMatchObject({ grade: 'house', plan: 'prebatch' });
  });

  it('lets a hired manager set the rush plan at the day boundary', () => {
    const managed = coffeeKioskBusiness({}, { staff: { operations: 0, sales: 0, manager: 1 } });
    expect(settleDay(managed).businesses[0]?.coffeeKiosk).toMatchObject({ plan: 'prebatch' });
    expect(settleDay(coffeeKioskBusiness()).businesses[0]?.coffeeKiosk).toMatchObject({
      plan: 'standard',
    });
  });
});

describe('installing order-ahead (BUS20e)', () => {
  it('is locked below Global', () => {
    const local = owning(coffeeKioskBusiness({}, { treasuryCents: dollars('900,000') }));
    expect(applyInstallOrderAhead(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = coffeeKioskBusiness({}, { stage: 5, treasuryCents: dollars('650,000') });
    const result = applyInstallOrderAhead(owning(global), order);
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('50,000'),
      capitalizedSpendCents: dollars('604,000'),
      coffeeKiosk: { orderAhead: 'installed' },
    });
    const again = applyInstallOrderAhead(
      owning(coffeeKioskBusiness({ orderAhead: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });

  it('needs the treasury to cover the price', () => {
    const poor = coffeeKioskBusiness({}, { stage: 5, treasuryCents: dollars('100') });
    expect(applyInstallOrderAhead(owning(poor), order)).toEqual({
      ok: false,
      error: 'INSUFFICIENT_TREASURY',
    });
  });
});
