import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, moneyCents } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import type { OwnedBusiness } from './owned';
import { applyMakeTakeoverOffer } from './takeoverCommands';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [vendingDefinition], rules: businessRules };
const offer = {
  businessId: 'vending',
  rivalId: 'snackpoint',
  amountCents: dollars('5,912'),
  economy,
};

const regional = (change: Partial<OwnedBusiness> = {}) =>
  ownedBusiness('vending', {
    stage: 3,
    units: 20,
    treasuryCents: dollars('10,000'),
    payoutPercent: 0,
    purchasedDay: 2,
    ...change,
  });

function owning(business: OwnedBusiness, day = 2): GameState {
  return {
    ...freshGameState({ saveId: 'rivals', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const stateAfter = (result: CommandResult) =>
  result.ok ? result.state : owning(ownedBusiness('x'));

const refusal = (business: OwnedBusiness, change: Partial<typeof offer> = {}) =>
  applyMakeTakeoverOffer(owning(business), { ...offer, ...change });

const settle = (business: OwnedBusiness, period: { fromMs: number; elapsedMs: number }) =>
  settleBusinesses([business], { ...period, economy, seed: 'rivals' }).businesses[0]!;

describe('making a takeover offer (BUS18)', () => {
  it('records one pending offer and takes nothing from the treasury yet', () => {
    const result = applyMakeTakeoverOffer(owning(regional()), offer);
    expect(result).toMatchObject({ ok: true, cashChangeCents: 0n });
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('10,000'),
      takeovers: {
        offer: { status: 'pending', rivalId: 'snackpoint', amountCents: offer.amountCents },
      },
    });
    const second = { ...offer, rivalId: 'coinbright' };
    expect(applyMakeTakeoverOffer(stateAfter(result), second)).toEqual({
      ok: false,
      error: 'OFFER_PENDING',
    });
  });

  it('refuses before Regional, for unknown rivals, empty offers and short treasuries', () => {
    expect(refusal(regional({ stage: 2 }))).toEqual({ ok: false, error: 'STAGE_LOCKED' });
    expect(refusal(regional(), { rivalId: 'nobody' })).toEqual({
      ok: false,
      error: 'UNKNOWN_ASSET',
    });
    expect(refusal(regional(), { amountCents: dollars('0') })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
    expect(refusal(regional({ treasuryCents: dollars('5,000') }))).toEqual({
      ok: false,
      error: 'INSUFFICIENT_TREASURY',
    });
    expect(refusal(regional({ status: 'closed' }))).toEqual({
      ok: false,
      error: 'BUSINESS_CLOSED',
    });
  });

  it('refuses a locked rival until its lock ends', () => {
    const locked = regional({
      takeovers: {
        offer: { status: 'none' },
        locks: [{ rivalId: 'snackpoint', untilDay: 7 }],
        merged: [],
      },
    });
    expect(applyMakeTakeoverOffer(owning(locked, 6), offer)).toEqual({
      ok: false,
      error: 'OFFER_LOCKED',
    });
    expect(applyMakeTakeoverOffer(owning(locked, 7), offer)).toMatchObject({ ok: true });
  });
});

describe('a takeover through the day boundary (AC40)', () => {
  it('pays from the treasury once and merges the rival, which then leaves the list', () => {
    const made = businessAfter(applyMakeTakeoverOffer(owning(regional()), offer))!;
    const day = { fromMs: 2 * DAY_MS, elapsedMs: DAY_MS };
    const without = settle(regional(), day);
    const after = settle(made, day);
    expect(after).toMatchObject({
      units: 25,
      levels: { quality: 2 },
      treasuryCents: moneyCents(without.treasuryCents - offer.amountCents),
      takeovers: { offer: { status: 'none' }, merged: ['snackpoint'] },
    });
    expect(applyMakeTakeoverOffer(owning(after, 3), offer)).toEqual({
      ok: false,
      error: 'UNKNOWN_ASSET',
    });
  });
});

describe('takeover answers played live or offline (AC37)', () => {
  const pending = regional({
    takeovers: {
      offer: { status: 'pending', rivalId: 'coinbright', amountCents: dollars('13,200') },
      locks: [],
      merged: [],
    },
  });

  it('gives the same answer and balances', () => {
    const offline = settle(pending, { fromMs: 2 * DAY_MS, elapsedMs: 30 * DAY_MS });
    const days = Array.from({ length: 30 }, (_, index) => index + 2);
    const live = days.reduce(
      (business, day) => settle(business, { fromMs: day * DAY_MS, elapsedMs: DAY_MS }),
      pending,
    );
    expect(live).toEqual(offline);
    expect(offline.takeovers.offer).toEqual({ status: 'none' });
  });
});
