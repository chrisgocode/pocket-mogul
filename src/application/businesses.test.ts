import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const ONE_MINUTE_MS = 60_000;

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
    expect(state.businesses).toEqual([
      {
        definitionId: 'vending',
        levels: { capacity: 0, quality: 0, efficiency: 0 },
        managerOwned: false,
        capitalizedSpendCents: dollars('250'),
      },
    ]);
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
  it('pays a base Vending Machine exactly $10 for 60 seconds (AC06)', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    clock.advance(ONE_MINUTE_MS);
    expect(await game.checkpoint()).toMatchObject({ ok: true });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('10'));
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
    expect<bigint>(state.cashCents).toBe(dollars('10'));
    expect(state.income.businessRemainders).toEqual({ vending: 0 });
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
    expect(game.getSnapshot().state.income.businessRemainders).toEqual({ vending: 40_000 });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0.16'));
  });

  it('lets income earned since the last checkpoint pay for a purchase', async () => {
    const { game, clock } = await startWith('1,490');
    await buy(game, 'vending');
    clock.advance(ONE_MINUTE_MS);
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

  it('credits nothing while paused', async () => {
    const { game, clock } = await startWith('250');
    await buy(game, 'vending');
    await game.pause();
    clock.advance(ONE_MINUTE_MS);
    game.resume();
    await game.checkpoint();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0'));
  });
});
