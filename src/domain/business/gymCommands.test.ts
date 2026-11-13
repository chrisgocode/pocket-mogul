import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { gymBusiness, gymDefinition } from '@/domain/testGym';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { applyUpgradeStage } from './growthCommands';
import { applyInstallAllHours, applySetClassLevel, applySetGymTier } from './gymCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [gymDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'gym_chain', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'gym', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const gymAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.gym : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const settleDay = (business: OwnedBusiness) =>
  settleBusinesses([business], { fromMs: 0, elapsedMs: DAY_MS, economy, seed: 'gym' });

describe('unlocking the gym mechanic (BUS20h)', () => {
  it('opens at Local with no members, Basic on sale and no classes', () => {
    const startup = ownedBusiness('gym_chain', { units: 3, treasuryCents: dollars('2,500,000') });
    const result = applyUpgradeStage(owning(startup, 8), { ...order, fromStage: 1 });
    expect(gymAfter(result)).toEqual({
      status: 'active',
      members: 0,
      tier: 'basic',
      classLevel: 0,
      allHours: 'none',
    });
  });

  it('opens at the next day boundary for a gym that is already Local, and signs up members', () => {
    const local = ownedBusiness('gym_chain', { stage: 2 });
    expect(settleDay(local).businesses[0]?.gym).toMatchObject({ status: 'active', members: 300 });
  });

  it('refuses changes below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('gym_chain'));
    expect(applySetGymTier(startup, { ...order, tier: 'elite' })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetClassLevel(vending, { businessId: 'vending', economy, level: 1 })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('running the gym (BUS20h)', () => {
  it('changes the tier on sale and keeps the members', () => {
    const state = owning(gymBusiness({ members: 5000 }));
    expect(gymAfter(applySetGymTier(state, { ...order, tier: 'plus' }))).toMatchObject({
      tier: 'plus',
      members: 5000,
    });
  });

  it('sets a class level up to the maximum', () => {
    const state = owning(gymBusiness());
    expect(gymAfter(applySetClassLevel(state, { ...order, level: 3 }))).toMatchObject({
      classLevel: 3,
    });
    expect(applySetClassLevel(state, { ...order, level: 4 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('grows the membership at every day boundary', () => {
    const settled = settleDay(gymBusiness({ members: 1000 }, { units: 3 }));
    expect(settled.businesses[0]?.gym).toMatchObject({ members: 1870 });
  });
});

describe('installing 24-hour access (BUS20h)', () => {
  it('is locked below Global', () => {
    const local = owning(gymBusiness({}, { treasuryCents: dollars('200,000,000') }));
    expect(applyInstallAllHours(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = gymBusiness({}, { stage: 5, treasuryCents: dollars('160,000,000') });
    expect(businessAfter(applyInstallAllHours(owning(global), order))).toMatchObject({
      treasuryCents: dollars('10,000,000'),
      capitalizedSpendCents: dollars('151,000,000'),
      gym: { allHours: 'installed' },
    });
    const again = applyInstallAllHours(
      owning(gymBusiness({ allHours: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
