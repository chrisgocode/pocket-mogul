import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import type { CommandResult } from '@/domain/commands';
import { applyFireStaff, applyHireStaff, applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { quoteStage } from './stages';

const economy = { catalog: [vendingDefinition], rules: businessRules };
const order = { businessId: 'vending', economy };
const pricing = { definition: vendingDefinition, rules: businessRules };
const DAY_MS = 600_000;

function owning(change: Partial<OwnedBusiness>, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'test', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [ownedBusiness('vending', change)],
  };
}

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : result.error;

const hire = (state: GameState, role: 'operations' | 'sales' | 'manager', fromCount = 0) =>
  applyHireStaff(state, { ...order, role, fromCount });

const upgrade = (state: GameState, fromStage = 1) =>
  applyUpgradeStage(state, { ...order, fromStage });

describe('hiring (BUS13)', () => {
  it('pays three days of wages from the treasury, not cash, and keeps it out of carrying value', () => {
    const result = hire(owning({ treasuryCents: dollars('20') }), 'operations');
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('0') });
    expect(businessAfter(result)).toMatchObject({
      staff: { operations: 1, sales: 0, manager: 0 },
      treasuryCents: dollars('3.20'),
      capitalizedSpendCents: dollars('250'),
    });
  });

  it('refuses a hire the treasury cannot pay', () => {
    expect(hire(owning({ treasuryCents: dollars('16') }), 'operations')).toEqual({
      ok: false,
      error: 'INSUFFICIENT_TREASURY',
    });
  });

  it('refuses a hire above the stage cap', () => {
    const full = owning({
      treasuryCents: dollars('100'),
      staff: { operations: 0, sales: 1, manager: 0 },
    });
    expect(hire(full, 'sales', 1)).toEqual({ ok: false, error: 'AT_CAP' });
  });

  it('refuses a manager before stage 2', () => {
    expect(hire(owning({ treasuryCents: dollars('100') }), 'manager')).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
  });

  it('hires a manager from stage 2', () => {
    const result = hire(owning({ stage: 2, treasuryCents: dollars('100') }), 'manager');
    expect(businessAfter(result)).toMatchObject({
      staff: { manager: 1 },
      treasuryCents: dollars('58'),
    });
  });

  it('refuses a stale headcount', () => {
    expect(hire(owning({ treasuryCents: dollars('100') }), 'sales', 1)).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });

  it('refuses while the business is closed', () => {
    expect(hire(owning({ status: 'closed' }), 'sales')).toEqual({
      ok: false,
      error: 'BUSINESS_CLOSED',
    });
  });
});

describe('firing (BUS13)', () => {
  const withSales = owning({ staff: { operations: 0, sales: 1, manager: 0 } });

  it('is free', () => {
    const result = applyFireStaff(withSales, { ...order, role: 'sales', fromCount: 1 });
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('0') });
    expect(businessAfter(result)).toMatchObject({
      staff: { sales: 0 },
      treasuryCents: dollars('0'),
    });
  });

  it('refuses when nobody holds the role', () => {
    expect(applyFireStaff(withSales, { ...order, role: 'operations', fromCount: 0 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });
});

describe('a stage upgrade (BUS15)', () => {
  const ready = { units: 3, treasuryCents: dollars('600') };

  it('quotes twice the purchase price, the unit cap and three days owned for Local', () => {
    expect(quoteStage(ownedBusiness('vending', { units: 2 }), { pricing, atMs: DAY_MS })).toEqual({
      status: 'not_ready',
      stage: 1,
      priceCents: dollars('500'),
      units: 2,
      unitsNeeded: 3,
      daysOwned: 1,
      daysNeeded: 3,
    });
  });

  it('pays from the treasury and counts in carrying value', () => {
    const result = upgrade(owning(ready, 3));
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('0') });
    expect(businessAfter(result)).toMatchObject({
      stage: 2,
      treasuryCents: dollars('100'),
      capitalizedSpendCents: dollars('750'),
    });
  });

  it('raises the caps', () => {
    const local = businessAfter(upgrade(owning(ready, 3)));
    expect(local).toMatchObject({ stage: 2 });
    expect(hire(owning({ ...ready, stage: 2 }), 'manager')).toMatchObject({ ok: true });
  });

  it('waits until the unit count reaches the cap', () => {
    expect(upgrade(owning({ ...ready, units: 2 }, 3))).toEqual({
      ok: false,
      error: 'STAGE_NOT_READY',
    });
  });

  it('waits for the days owned', () => {
    expect(upgrade(owning(ready, 2))).toEqual({ ok: false, error: 'STAGE_NOT_READY' });
  });

  it('stops at Global', () => {
    expect(upgrade(owning({ ...ready, stage: 5 }, 100), 5)).toEqual({
      ok: false,
      error: 'MAX_LEVEL',
    });
  });

  it('refuses a stale stage', () => {
    expect(upgrade(owning(ready, 3), 2)).toEqual({ ok: false, error: 'STALE_QUOTE' });
  });
});
