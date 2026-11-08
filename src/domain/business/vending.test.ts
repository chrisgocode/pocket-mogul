import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness } from '@/domain/testRules';
import { vendingBusiness, vendingFlagship, vendingRules, vendingSpots } from '@/domain/testVending';

import { applyBuyUnit } from './commands';
import { profitPerDayCents, quoteBusinessDay } from './core';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';
import { bestMix, matchBps } from './vendingDemand';
import { VENDING_LOCATIONS, type VendingOperation } from './vendingRules';

const DAY_MS = 600_000;
const pricing = { definition: vendingFlagship, rules: businessRules };
const economy = { catalog: [vendingFlagship], rules: businessRules };
const order = { businessId: 'vending', economy };

const settle = (business: OwnedBusiness, days: number) =>
  settleBusinesses([business], { fromMs: 0, elapsedMs: days * DAY_MS, economy, seed: 'vend' })
    .businesses[0];

const spotsOf = (business: OwnedBusiness | undefined) =>
  business?.vending.status === 'active' ? business.vending.spots : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'vend', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const officeMachine = { office: { machines: 1, mix: 'balanced', stock: 300 } } as const;

const withReaders: VendingOperation = {
  status: 'active',
  spots: vendingSpots(officeMachine),
  cardReaders: 'installed',
};

describe('a vending machine at stage 1 (BUS20a)', () => {
  it('runs on the shared core only, so the §12 figures hold', () => {
    const base = ownedBusiness('vending');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({ demand: 110, served: 100 });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('100'));
  });
});

describe('stock mixes and locations (BUS20a)', () => {
  it('scores a mix by how much it overlaps the location’s taste, from 60 to 140 percent', () => {
    expect(matchBps(vendingRules, { location: 'office', mix: 'balanced' })).toBe(12_560);
    expect(matchBps(vendingRules, { location: 'school', mix: 'snacks' })).toBe(13_600);
    expect(matchBps(vendingRules, { location: 'school', mix: 'healthy' })).toBe(9200);
  });

  it('finds the best mix for each location', () => {
    expect(VENDING_LOCATIONS.map((location) => bestMix(vendingRules, location))).toEqual([
      'balanced',
      'healthy',
      'snacks',
      'drinks',
      'healthy',
    ]);
  });

  it('multiplies demand by the location’s traffic and match', () => {
    expect(quoteBusinessDay(vendingBusiness(officeMachine), pricing).demand).toBe(138);
    const station = vendingBusiness({ station: { machines: 1, mix: 'drinks', stock: 300 } });
    expect(quoteBusinessDay(station, pricing).demand).toBe(209);
  });

  it('lets a well-placed machine charge more', () => {
    const premium = vendingBusiness(officeMachine, { priceLevel: 'premium' });
    expect(quoteBusinessDay(premium, pricing)).toMatchObject({
      served: 100,
      profitCents: dollars('135'),
    });
  });
});

describe('a location out of stock (AC42)', () => {
  it('serves no one', () => {
    const empty = vendingBusiness({ office: { machines: 1, mix: 'balanced', stock: 0 } });
    expect(quoteBusinessDay(empty, pricing)).toMatchObject({
      demand: 0,
      capacity: 0,
      served: 0,
      profitCents: dollars('-16'),
    });
  });

  it('takes its machines’ capacity and demand out of the business', () => {
    const half = vendingBusiness({
      ...officeMachine,
      gym: { machines: 1, mix: 'healthy', stock: 0 },
    });
    expect(quoteBusinessDay(half, pricing)).toMatchObject({ capacity: 100, served: 100 });
  });

  it('sells stock in proportion to customers served at each day boundary', () => {
    expect(spotsOf(settle(vendingBusiness(officeMachine), 1))?.office.stock).toBe(200);
    expect(spotsOf(settle(vendingBusiness(officeMachine), 4))?.office.stock).toBe(0);
  });

  it('stays empty without a Restocker', () => {
    const empty = vendingBusiness(
      { office: { machines: 1, mix: 'balanced', stock: 0 } },
      { treasuryCents: dollars('50') },
    );
    expect(spotsOf(settle(empty, 1))?.office.stock).toBe(0);
  });

  it('is restocked by a Restocker at the next day boundary, paying the fee from the treasury', () => {
    const empty = vendingBusiness(
      { office: { machines: 1, mix: 'balanced', stock: 0 } },
      { treasuryCents: dollars('50'), staff: { operations: 1, sales: 0, manager: 0 } },
    );
    const restocked = settle(empty, 1);
    expect(spotsOf(restocked)?.office.stock).toBe(300);
    expect(restocked?.treasuryCents).toBe(dollars('26.40'));
    expect(quoteBusinessDay(restocked!, pricing).served).toBe(120);
  });

  it('skips a restock the treasury can’t pay', () => {
    const empty = vendingBusiness(
      { office: { machines: 1, mix: 'balanced', stock: 0 } },
      { treasuryCents: dollars('22.60'), staff: { operations: 1, sales: 0, manager: 0 } },
    );
    const settled = settle(empty, 1);
    expect(spotsOf(settled)?.office.stock).toBe(0);
    expect(settled?.treasuryCents).toBe(dollars('1'));
  });
});

describe('a vending manager (BUS14)', () => {
  it('moves each location’s mix to its best match at the day boundary', () => {
    const misfit = vendingBusiness(
      { school: { machines: 1, mix: 'drinks', stock: 300 } },
      { treasuryCents: dollars('50'), staff: { operations: 0, sales: 0, manager: 1 } },
    );
    expect(spotsOf(settle(misfit, 1))?.school.mix).toBe('snacks');
  });
});

describe('card readers (BUS20a)', () => {
  it('add 20 percent to demand at every price level', () => {
    const installed = vendingBusiness(officeMachine, { stage: 5, vending: withReaders });
    expect(quoteBusinessDay(installed, pricing).demand).toBe(165);
  });
});

describe('unlocking the mechanic', () => {
  it('stands every machine at the Office with full stock when the business reaches Local', () => {
    const ready = ownedBusiness('vending', { units: 3, treasuryCents: dollars('600') });
    const result = applyUpgradeStage(owning(ready, 3), { ...order, fromStage: 1 });
    const grown = businessAfter(result);
    expect(spotsOf(grown)?.office).toEqual({ machines: 3, mix: 'balanced', stock: 900 });
    expect(spotsOf(grown)?.station).toEqual({ machines: 0, mix: 'balanced', stock: 0 });
  });

  it('stands a new machine at the Office', () => {
    const placed = vendingBusiness(
      { ...officeMachine, gym: { machines: 1, mix: 'healthy', stock: 300 } },
      { treasuryCents: dollars('500') },
    );
    const result = applyBuyUnit(owning(placed), { ...order, fromUnits: 2 });
    const grown = businessAfter(result);
    expect(spotsOf(grown)?.office).toEqual({ machines: 2, mix: 'balanced', stock: 300 });
    expect(spotsOf(grown)?.gym.machines).toBe(1);
  });

  it('activates an older Local save at the next day boundary', () => {
    const older = ownedBusiness('vending', { stage: 2, units: 2, treasuryCents: dollars('50') });
    expect(spotsOf(settle(older, 1))?.office).toEqual({
      machines: 2,
      mix: 'balanced',
      stock: 600,
    });
  });
});
