import { CURRENT_ECONOMY_VERSION } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const ONE_MINUTE_MS = 60_000;

const command = (game: Game, type: 'BuyBusiness' | 'SellBusiness', id: string = type) =>
  game.dispatch({ id, command: { type, businessId: 'vending' } });

const deposit = (game: Game, amount: string, id = `deposit-${amount}`) =>
  game.dispatch({
    id,
    command: { type: 'DepositToTreasury', businessId: 'vending', amountCents: dollars(amount) },
  });

const buyUnit = (game: Game, fromUnits: number) =>
  game.dispatch({
    id: `unit-${fromUnits}`,
    command: { type: 'BuyUnit', businessId: 'vending', fromUnits },
  });

async function startWith(cash: string): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    cashCents: dollars(cash),
  });
}

describe('selling a business', () => {
  it('settles income first, then pays 60% of its spending plus its whole treasury', async () => {
    const { game, clock } = await startWith('800');
    await command(game, 'BuyBusiness');
    await deposit(game, '100');
    await buyUnit(game, 1);
    clock.advance(ONE_MINUTE_MS);
    expect(await command(game, 'SellBusiness')).toMatchObject({
      ok: true,
      cashChangeCents: dollars('218.61'),
    });
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('677.21'));
    expect(state.businesses).toEqual([]);
  });

  it('starts a repurchase fresh at stage 1 with one unit', async () => {
    const { game } = await startWith('1,100');
    await command(game, 'BuyBusiness');
    await deposit(game, '100');
    await buyUnit(game, 1);
    await command(game, 'SellBusiness');
    await command(game, 'BuyBusiness', 'buy-again');
    expect(game.getSnapshot().state.businesses).toEqual([ownedBusiness('vending')]);
  });

  it('refuses to sell a business the player does not own', async () => {
    const { game } = await startWith('10');
    expect(await command(game, 'SellBusiness')).toEqual({ ok: false, error: 'NOT_OWNED' });
  });
});

const buyLaundromat = (game: Game) =>
  game.dispatch({ id: 'laundromat', command: { type: 'BuyBusiness', businessId: 'laundromat' } });

describe('tier unlocks (BUS07)', () => {
  it('keeps Tier 2 open after net worth falls below $5,000 (AC11)', async () => {
    const { game } = await startWith('4,999.99');
    expect(await buyLaundromat(game)).toEqual({ ok: false, error: 'LOCKED_TIER' });
    await game.dispatch({ id: 'tap', command: { type: 'TapBatch', taps: 1 } });
    expect(game.getSnapshot().state.unlockedTiers).toEqual([1, 2]);
    await command(game, 'BuyBusiness');
    await command(game, 'SellBusiness');
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('4,900.99'));
    expect(await buyLaundromat(game)).toEqual({ ok: false, error: 'INSUFFICIENT_CASH' });
    expect(game.getSnapshot().state.unlockedTiers).toEqual([1, 2]);
  });
});
