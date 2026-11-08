import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { carWashBusiness, carWashFlagship } from '@/domain/testCarWash';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import {
  applyInstallDetailing,
  applySetMemberCap,
  applySetMembershipPrice,
  applySetWashPackage,
} from './carWashCommands';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [carWashFlagship, vendingDefinition], rules: businessRules };
const order = { businessId: 'car_wash', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'wash', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const carWashAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.carWash : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const stateAfter = (result: CommandResult) =>
  result.ok ? result.state : owning(ownedBusiness('x'));

const settle = (business: OwnedBusiness, period: { fromMs: number; elapsedMs: number }) =>
  settleBusinesses([business], { ...period, economy, seed: 'wash' });

type Played = { readonly business: OwnedBusiness; readonly toCashCents: bigint };

function playDay(sofar: Played, day: number): Played {
  const next = settle(sofar.business, { fromMs: day * DAY_MS, elapsedMs: DAY_MS });
  return {
    business: next.businesses[0] ?? sofar.business,
    toCashCents: sofar.toCashCents + next.toCashCents,
  };
}

describe('unlocking the car wash mechanic (BUS20b)', () => {
  it('opens at Local with every package offered, no members and the seeded weather', () => {
    const startup = ownedBusiness('car_wash', { units: 3, treasuryCents: dollars('60,000') });
    const result = applyUpgradeStage(owning(startup, 8), { ...order, fromStage: 1 });
    expect(carWashAfter(result)).toEqual({
      status: 'active',
      weather: 'rain',
      packages: { deluxe: 'offered', ultimate: 'offered' },
      members: 0,
      membershipLevel: 'standard',
      memberCapPercent: 20,
      detailing: 'none',
    });
  });

  it('rejects car wash settings before Local and on another business', () => {
    const startup = owning(ownedBusiness('car_wash'));
    const withdraw = { ...order, washPackage: 'ultimate', offered: false } as const;
    expect(applySetWashPackage(startup, withdraw)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetWashPackage(vending, { ...withdraw, businessId: 'vending' })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('car wash settings (BUS20b)', () => {
  const state = owning(carWashBusiness());

  it('turns Deluxe and Ultimate off and on', () => {
    const off = applySetWashPackage(state, { ...order, washPackage: 'deluxe', offered: false });
    expect(carWashAfter(off)).toMatchObject({
      packages: { deluxe: 'withdrawn', ultimate: 'offered' },
    });
  });

  it('sets the membership price level', () => {
    const budget = applySetMembershipPrice(state, { ...order, priceLevel: 'budget' });
    expect(carWashAfter(budget)).toMatchObject({ membershipLevel: 'budget' });
  });

  it('sets the member cap on a cap step up to the maximum', () => {
    expect(carWashAfter(applySetMemberCap(state, { ...order, capPercent: 60 }))).toMatchObject({
      memberCapPercent: 60,
    });
    expect(applySetMemberCap(state, { ...order, capPercent: 30 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
    expect(applySetMemberCap(state, { ...order, capPercent: 100 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });
});

describe('detailing (BUS20b)', () => {
  it('unlocks at Global and is paid once from the treasury as capital', () => {
    const local = owning(carWashBusiness({}, { treasuryCents: dollars('5,000,000') }));
    expect(applyInstallDetailing(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
    const global = owning(carWashBusiness({}, { stage: 5, treasuryCents: dollars('5,000,000') }));
    const result = applyInstallDetailing(global, order);
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('500,000'),
      capitalizedSpendCents: dollars('4,530,000'),
      carWash: { detailing: 'installed' },
    });
    expect(applyInstallDetailing(stateAfter(result), order)).toEqual({
      ok: false,
      error: 'MAX_LEVEL',
    });
  });
});

describe('car wash days played live or offline (AC37)', () => {
  const managed = carWashBusiness(
    { members: 40 },
    { units: 3, treasuryCents: dollars('100'), staff: { operations: 0, sales: 0, manager: 1 } },
  );

  it('gives identical weather, members and balances', () => {
    const offline = settle(managed, { fromMs: 0, elapsedMs: 30 * DAY_MS });
    const days = Array.from({ length: 30 }, (_, day) => day);
    const live = days.reduce(playDay, { business: managed, toCashCents: 0n });
    expect(live.business).toEqual(offline.businesses[0]);
    expect(live.toCashCents).toBe(offline.toCashCents);
    expect(offline.businesses[0]?.carWash).toMatchObject({
      members: 1260,
      memberCapPercent: 60,
      weather: 'rain',
    });
  });
});
