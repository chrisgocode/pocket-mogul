import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { laundromatBusiness, laundromatDefinition } from '@/domain/testLaundromat';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { applyUpgradeStage } from './growthCommands';
import { applyInstallPickup, applySetJumboShare, applySetServiceLevel } from './laundromatCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [laundromatDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'laundromat', economy };
const oneAttendant = { staff: { operations: 1, sales: 0, manager: 0 } };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'wash', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const laundromatAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.laundromat : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const settleDay = (business: OwnedBusiness) =>
  settleBusinesses([business], { fromMs: 0, elapsedMs: DAY_MS, economy, seed: 'wash' });

describe('unlocking the laundromat mechanic (BUS20f)', () => {
  it('opens at Local with no jumbo machines and service washes off', () => {
    const startup = ownedBusiness('laundromat', { units: 3, treasuryCents: dollars('20,000') });
    const result = applyUpgradeStage(owning(startup, 8), { ...order, fromStage: 1 });
    expect(laundromatAfter(result)).toEqual({
      status: 'active',
      jumboPercent: 0,
      serviceLevel: 0,
      pickup: 'none',
    });
  });

  it('opens at the next day boundary for a laundromat that is already Local', () => {
    const local = ownedBusiness('laundromat', { stage: 2 });
    expect(settleDay(local).businesses[0]?.laundromat).toMatchObject({ status: 'active' });
  });

  it('refuses changes below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('laundromat'));
    expect(applySetJumboShare(startup, { ...order, percent: 20 })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetServiceLevel(vending, { businessId: 'vending', economy, level: 1 })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('running the laundromat (BUS20f)', () => {
  it('sets a jumbo share from the list and refuses any other', () => {
    const state = owning(laundromatBusiness());
    expect(laundromatAfter(applySetJumboShare(state, { ...order, percent: 40 }))).toMatchObject({
      jumboPercent: 40,
    });
    expect(applySetJumboShare(state, { ...order, percent: 35 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('offers one service level per attendant', () => {
    const state = owning(laundromatBusiness({}, oneAttendant));
    expect(laundromatAfter(applySetServiceLevel(state, { ...order, level: 1 }))).toMatchObject({
      serviceLevel: 1,
    });
    expect(applySetServiceLevel(state, { ...order, level: 2 })).toEqual({
      ok: false,
      error: 'AT_CAP',
    });
    expect(applySetServiceLevel(state, { ...order, level: 4 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('lets a hired manager set the jumbo share at the day boundary', () => {
    const managed = laundromatBusiness({}, { staff: { operations: 0, sales: 0, manager: 1 } });
    expect(settleDay(managed).businesses[0]?.laundromat).toMatchObject({ jumboPercent: 40 });
    expect(settleDay(laundromatBusiness()).businesses[0]?.laundromat).toMatchObject({
      jumboPercent: 0,
    });
  });
});

describe('installing pickup and delivery (BUS20f)', () => {
  it('is locked below Global', () => {
    const local = owning(laundromatBusiness({}, { treasuryCents: dollars('2,000,000') }));
    expect(applyInstallPickup(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = laundromatBusiness({}, { stage: 5, treasuryCents: dollars('1,200,000') });
    expect(businessAfter(applyInstallPickup(owning(global), order))).toMatchObject({
      treasuryCents: dollars('75,000'),
      capitalizedSpendCents: dollars('1,132,500'),
      laundromat: { pickup: 'installed' },
    });
    const again = applyInstallPickup(
      owning(laundromatBusiness({ pickup: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
