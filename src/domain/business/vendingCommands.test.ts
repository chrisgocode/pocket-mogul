import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';
import { vendingBusiness, vendingFlagship } from '@/domain/testVending';

import type { OwnedBusiness } from './owned';
import type { VendingLocation } from './vendingRules';
import {
  applyInstallCardReaders,
  applyMoveVendingMachine,
  applyRestockVending,
  applySetVendingMix,
} from './vendingCommands';

const economy = { catalog: [vendingFlagship], rules: businessRules };
const order = { businessId: 'vending', economy };

function owning(business: OwnedBusiness): GameState {
  return {
    ...freshGameState({ saveId: 'vend', economyVersion: 1, wallMs: 0 }),
    businesses: [business],
  };
}

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : result.error;

const vendingAfter = (result: CommandResult) => {
  const business = businessAfter(result);
  return typeof business === 'object' ? business.vending : business;
};

const move = (business: OwnedBusiness, route: { from: VendingLocation; to: VendingLocation }) =>
  applyMoveVendingMachine(owning(business), { ...order, ...route });

function installedTwice(state: GameState): CommandResult {
  const first = applyInstallCardReaders(state, order);
  return first.ok ? applyInstallCardReaders(first.state, order) : first;
}

const twoAtOffice = vendingBusiness(
  { office: { machines: 2, mix: 'balanced', stock: 500 } },
  { treasuryCents: dollars('10') },
);

describe('moving a machine (BUS20a)', () => {
  it('carries its share of the stock to the new location', () => {
    const moved = applyMoveVendingMachine(owning(twoAtOffice), {
      ...order,
      from: 'office',
      to: 'station',
    });
    expect(vendingAfter(moved)).toMatchObject({
      spots: {
        office: { machines: 1, stock: 250 },
        station: { machines: 1, stock: 250 },
      },
    });
  });

  it('refuses a location with no free slot, an empty source and the same location', () => {
    const fullGym = vendingBusiness({
      office: { machines: 1, mix: 'balanced', stock: 300 },
      gym: { machines: 20, mix: 'healthy', stock: 0 },
    });
    expect(move(fullGym, { from: 'office', to: 'gym' })).toEqual({ ok: false, error: 'AT_CAP' });
    expect(move(twoAtOffice, { from: 'gym', to: 'office' })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
    expect(move(twoAtOffice, { from: 'office', to: 'office' })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('is locked below Local and unavailable for a business without the mechanic', () => {
    const toGym = { ...order, from: 'office', to: 'gym' } as const;
    expect(applyMoveVendingMachine(owning(ownedBusiness('vending')), toGym)).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const sharedCore = { ...toGym, economy: { ...economy, catalog: [vendingDefinition] } };
    expect(applyMoveVendingMachine(owning(twoAtOffice), sharedCore)).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('choosing a stock mix (BUS20a)', () => {
  it('sets one location’s mix for free', () => {
    const result = applySetVendingMix(owning(twoAtOffice), {
      ...order,
      location: 'office',
      mix: 'drinks',
    });
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('0') });
    expect(vendingAfter(result)).toMatchObject({ spots: { office: { mix: 'drinks' } } });
  });
});

describe('restocking (BUS20a)', () => {
  it('fills a location and pays its fee per machine from the treasury as an operating cost', () => {
    const result = applyRestockVending(owning(twoAtOffice), { ...order, location: 'office' });
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('6'),
      capitalizedSpendCents: dollars('250'),
      vending: { spots: { office: { stock: 600 } } },
    });
  });

  it('restocks every location in one tap', () => {
    const spread = vendingBusiness(
      {
        office: { machines: 1, mix: 'balanced', stock: 0 },
        station: { machines: 1, mix: 'drinks', stock: 100 },
        gym: { machines: 1, mix: 'healthy', stock: 300 },
      },
      { treasuryCents: dollars('10') },
    );
    const result = applyRestockVending(owning(spread), { ...order, location: 'all' });
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('4'),
      vending: { spots: { office: { stock: 300 }, station: { stock: 300 }, gym: { stock: 300 } } },
    });
  });

  it('refuses when nothing needs stock or the treasury is short', () => {
    const full = vendingBusiness({ office: { machines: 1, mix: 'balanced', stock: 300 } });
    expect(applyRestockVending(owning(full), { ...order, location: 'all' })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
    const poor = { ...twoAtOffice, treasuryCents: dollars('3') };
    expect(applyRestockVending(owning(poor), { ...order, location: 'office' })).toEqual({
      ok: false,
      error: 'INSUFFICIENT_TREASURY',
    });
  });
});

describe('card readers (BUS20a)', () => {
  const atGlobal = vendingBusiness(
    { office: { machines: 1, mix: 'balanced', stock: 300 } },
    { stage: 5, treasuryCents: dollars('40,000') },
  );

  it('unlock at Global', () => {
    expect(applyInstallCardReaders(owning({ ...atGlobal, stage: 4 }), order)).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
  });

  it('are paid once from the treasury and count in carrying value', () => {
    const result = applyInstallCardReaders(owning(atGlobal), order);
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('2,500'),
      capitalizedSpendCents: dollars('37,750'),
      vending: { cardReaders: 'installed' },
    });
    expect(installedTwice(owning(atGlobal))).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
