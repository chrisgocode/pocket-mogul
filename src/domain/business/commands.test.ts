import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import {
  applyBuyBusiness,
  applyBuyUnit,
  applyDepositToTreasury,
  applyImproveBusiness,
  applySellBusiness,
  applySetPayout,
  applySetPriceLevel,
  applyWithdrawFromTreasury,
} from './commands';
import type { OwnedBusiness } from './owned';

const economy = { catalog: [vendingDefinition], rules: businessRules };
const order = { businessId: 'vending', economy };

function owning(change: Partial<OwnedBusiness>, cash = '0'): GameState {
  return {
    ...freshGameState({ saveId: 'test', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
    businesses: [ownedBusiness('vending', change)],
  };
}

const businessAfter = (result: ReturnType<typeof applyBuyUnit>) =>
  result.ok ? result.state.businesses[0] : result.error;

describe('buying a business', () => {
  it('opens it at stage 1 with one unit, Standard price, an empty treasury and 50 percent payout (BUS01)', () => {
    const start = {
      ...freshGameState({ saveId: 'test', economyVersion: 1, wallMs: 0 }),
      cashCents: dollars('300'),
      clock: { simulationMs: 1_800_000, lastWallCheckpointMs: 0 },
    };
    const result = applyBuyBusiness(start, order);
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('-250') });
    expect(businessAfter(result)).toEqual(
      ownedBusiness('vending', { purchasedDay: 3, capitalizedSpendCents: dollars('250') }),
    );
  });
});

describe('spending from the treasury (BUS10)', () => {
  it('buys a unit from the treasury, not from cash', () => {
    const result = applyBuyUnit(owning({ treasuryCents: dollars('150') }, '500'), {
      ...order,
      fromUnits: 1,
    });
    expect(result).toMatchObject({ ok: true, cashChangeCents: 0n });
    expect(businessAfter(result)).toMatchObject({
      units: 2,
      treasuryCents: dollars('50'),
      capitalizedSpendCents: dollars('350'),
    });
  });

  it('refuses a unit the treasury cannot pay for, whatever the cash', () => {
    const result = applyBuyUnit(owning({ treasuryCents: dollars('99.99') }, '5,000'), {
      ...order,
      fromUnits: 1,
    });
    expect(result).toEqual({ ok: false, error: 'INSUFFICIENT_TREASURY' });
  });

  it('refuses a unit beyond the stage cap', () => {
    const full = owning({ units: 3, treasuryCents: dollars('1,000') });
    expect(applyBuyUnit(full, { ...order, fromUnits: 3 })).toEqual({ ok: false, error: 'AT_CAP' });
  });

  it('refuses a unit quote reviewed at an older count', () => {
    const grown = owning({ units: 2, treasuryCents: dollars('1,000') });
    expect(applyBuyUnit(grown, { ...order, fromUnits: 1 })).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });

  it('upgrades Quality from the treasury', () => {
    const result = applyImproveBusiness(owning({ treasuryCents: dollars('62.50') }), {
      ...order,
      track: 'quality',
      fromLevel: 0,
    });
    expect(businessAfter(result)).toMatchObject({
      levels: { quality: 1, efficiency: 0 },
      treasuryCents: 0n,
    });
  });

  it('refuses to spend while the business is closed', () => {
    const closed = owning({ status: 'closed', treasuryCents: dollars('500') });
    expect(applyImproveBusiness(closed, { ...order, track: 'efficiency', fromLevel: 0 })).toEqual({
      ok: false,
      error: 'BUSINESS_CLOSED',
    });
  });
});

describe('settings', () => {
  it('changes the price level at once (BUS06)', () => {
    const result = applySetPriceLevel(owning({}), { ...order, priceLevel: 'premium' });
    expect(businessAfter(result)).toMatchObject({ priceLevel: 'premium' });
  });

  it('sets the payout in steps of 10 percent', () => {
    expect(
      businessAfter(applySetPayout(owning({}), { ...order, payoutPercent: 70 })),
    ).toMatchObject({ payoutPercent: 70 });
    expect(applySetPayout(owning({}), { ...order, payoutPercent: 75 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
    expect(applySetPayout(owning({}), { ...order, payoutPercent: 110 })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });
});

describe('deposits and withdrawals (BUS11, BUS12)', () => {
  it('moves cash into the treasury and reopens a closed business', () => {
    const result = applyDepositToTreasury(owning({ status: 'closed' }, '80'), {
      ...order,
      amountCents: dollars('30'),
    });
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('-30') });
    expect(businessAfter(result)).toMatchObject({ status: 'open', treasuryCents: dollars('30') });
  });

  it('refuses a deposit larger than cash', () => {
    const result = applyDepositToTreasury(owning({}, '10'), {
      ...order,
      amountCents: dollars('10.01'),
    });
    expect(result).toEqual({ ok: false, error: 'INSUFFICIENT_CASH' });
  });

  it('withdraws to cash, never more than the treasury holds', () => {
    const funded = owning({ treasuryCents: dollars('40') });
    const result = applyWithdrawFromTreasury(funded, { ...order, amountCents: dollars('40') });
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('40') });
    expect(businessAfter(result)).toMatchObject({ treasuryCents: 0n });
    expect(applyWithdrawFromTreasury(funded, { ...order, amountCents: dollars('40.01') })).toEqual({
      ok: false,
      error: 'INSUFFICIENT_TREASURY',
    });
  });
});

describe('selling', () => {
  it('returns the whole treasury plus 60 percent of spending', () => {
    const result = applySellBusiness(owning({ treasuryCents: dollars('50') }), order);
    expect(result).toMatchObject({ ok: true, cashChangeCents: dollars('200') });
  });
});
