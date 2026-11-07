import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const ONE_MINUTE_MS = 60_000;
const BUSINESS_DAY_MS = 600_000;

const buy = (game: Game, businessId: string, id = `buy-${businessId}`) =>
  game.dispatch({ id, command: { type: 'BuyBusiness', businessId } });

async function startWith(cash: string): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
  });
}

describe('buying a business', () => {
  it('spends the price and records ownership in one save (BUS01)', async () => {
    const session = await startWith('300');
    expect(await buy(session.game, 'vending')).toEqual({
      ok: true,
      revision: 1,
      cashChangeCents: dollars('-250'),
    });
    const { game } = await session.restart();
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('50'));
    expect(state.businesses).toEqual([ownedBusiness('vending')]);
  });

  it('refuses a second copy with ALREADY_OWNED and spends nothing (BUS01)', async () => {
    const { game } = await startWith('600');
    await buy(game, 'vending');
    expect(await buy(game, 'vending', 'buy-again')).toEqual({ ok: false, error: 'ALREADY_OWNED' });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('350'));
    expect(game.getSnapshot().state.businesses).toHaveLength(1);
  });

  it('spends nothing when cash is short (AC05)', async () => {
    const { game } = await startWith('249.99');
    expect(await buy(game, 'vending')).toEqual({ ok: false, error: 'INSUFFICIENT_CASH' });
    expect(game.getSnapshot().state.businesses).toEqual([]);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('249.99'));
  });

  it('refuses a business from a locked tier', async () => {
    const { game } = await startWith('4,999.99');
    expect(await buy(game, 'laundromat')).toEqual({ ok: false, error: 'LOCKED_TIER' });
  });

  it('refuses an unknown business', async () => {
    const { game } = await startWith('10000');
    expect(await buy(game, 'time_machine')).toEqual({ ok: false, error: 'UNKNOWN_ASSET' });
  });
});

describe('passive income', () => {
  it('splits a base Vending Machine business day into $50 cash and $50 treasury (AC06)', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    clock.advance(BUSINESS_DAY_MS);
    expect(await game.checkpoint()).toMatchObject({ ok: true });
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('50'));
    expect(state.businesses[0]?.treasuryCents).toBe(dollars('50'));
  });

  it('pays sixty one-second steps the same as one minute (AC08)', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    await Array.from({ length: 60 }).reduce<Promise<unknown>>(
      (previous) =>
        previous.then(() => {
          clock.advance(1_000);
          return game.checkpoint();
        }),
      Promise.resolve(),
    );
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('5'));
    expect(state.businesses[0]).toMatchObject({
      treasuryCents: dollars('5'),
      profitRemainder: 0,
      payoutRemainder: 0,
    });
    expect(state.clock.simulationMs).toBe(ONE_MINUTE_MS);
  });

  it('checkpoints on its own at least every five seconds', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    clock.advance(5_000);
    await game.flushTaps();
    expect(game.getSnapshot().state.revision).toBe(2);
    expect(game.getSnapshot().state.clock.simulationMs).toBe(5_000);
  });

  it('shows unsaved income growing between checkpoints', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    clock.advance(3_000);
    expect(game.getSnapshot().unsavedElapsedMs).toBe(3_000);
    expect(game.getSnapshot().state.revision).toBe(1);
  });

  it('keeps a stream remainder across a restart', async () => {
    const session = await startWith('250');
    await buy(session.game, 'vending');
    session.clock.advance(1_000);
    await session.game.checkpoint();
    const { game } = await session.restart();
    const { state } = game.getSnapshot();
    expect(state.businesses[0]).toMatchObject({
      profitRemainder: 400_000,
      treasuryCents: dollars('0.08'),
    });
    expect<bigint>(state.cashCents).toBe(dollars('0.08'));
  });
});

describe('income between checkpoints', () => {
  it('lets income earned since the last checkpoint pay for a purchase', async () => {
    const { game, clock } = await startWith('1,490');
    await buy(game, 'vending');
    clock.advance(2 * ONE_MINUTE_MS);
    expect(await buy(game, 'food_cart')).toMatchObject({ ok: true });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0'));
  });

  it('credits whole milliseconds from a fractional device clock and keeps the rest', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    clock.advance(1_000.75);
    expect(await game.checkpoint()).toMatchObject({ ok: true });
    expect(game.getSnapshot().state.clock.simulationMs).toBe(1_000);
    clock.advance(0.5);
    await game.checkpoint();
    expect(game.getSnapshot().state.clock.simulationMs).toBe(1_001);
  });

  it('credits a minute in the background once, as offline time rather than foreground time', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    await game.pause();
    clock.advance(ONE_MINUTE_MS);
    await game.resume();
    await game.checkpoint();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('5'));
  });
});
