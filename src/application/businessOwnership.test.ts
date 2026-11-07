import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import type { Game } from './game';
import { encodeSave } from './saveFormat';
import { migratedState, startTestGameFrom, type TestGame } from './testGame';

const ONE_MINUTE_MS = 60_000;

const command = (
  game: Game,
  type: 'BuyBusiness' | 'HireManager' | 'SellBusiness',
  id: string = type,
) => game.dispatch({ id, command: { type, businessId: 'vending' } });

const upgradeCapacity = (game: Game, fromLevel: number) =>
  game.dispatch({
    id: `capacity-${fromLevel}`,
    command: { type: 'UpgradeBusiness', businessId: 'vending', track: 'capacity', fromLevel },
  });

async function startWith(cash: string): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
  });
}

describe('hiring a manager (BUS03)', () => {
  it('costs twice the price, adds 10% net profit and stays out of the sale basis', async () => {
    const { game, clock } = await startWith('750');
    await command(game, 'BuyBusiness');
    expect(await command(game, 'HireManager')).toMatchObject({
      ok: true,
      cashChangeCents: dollars('-500'),
    });
    clock.advance(ONE_MINUTE_MS);
    await game.checkpoint();
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('11'));
    expect(state.businesses[0]).toMatchObject({
      managerOwned: true,
      capitalizedSpendCents: dollars('250'),
    });
  });

  it('can be hired only once', async () => {
    const { game } = await startWith('1,250');
    await command(game, 'BuyBusiness');
    await command(game, 'HireManager');
    expect(await command(game, 'HireManager', 'again')).toEqual({
      ok: false,
      error: 'ALREADY_OWNED',
    });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('500'));
  });
});

describe('selling a business (BUS06)', () => {
  it('settles income first, then pays 60% of purchase plus upgrade spending', async () => {
    const { game, clock } = await startWith('800');
    await command(game, 'BuyBusiness');
    await upgradeCapacity(game, 0);
    await command(game, 'HireManager');
    clock.advance(ONE_MINUTE_MS);
    expect(await command(game, 'SellBusiness')).toMatchObject({ ok: true });
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('192.27'));
    expect(state.businesses).toEqual([]);
  });

  it('starts a repurchase at level zero with no manager', async () => {
    const { game } = await startWith('1,100');
    await command(game, 'BuyBusiness');
    await upgradeCapacity(game, 0);
    await command(game, 'HireManager');
    await command(game, 'SellBusiness');
    await command(game, 'BuyBusiness', 'buy-again');
    expect(game.getSnapshot().state.businesses).toEqual([
      {
        definitionId: 'vending',
        levels: { capacity: 0, quality: 0, efficiency: 0 },
        managerOwned: false,
        capitalizedSpendCents: dollars('250'),
      },
    ]);
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

describe('saves from before business upgrades', () => {
  it('load an owned business at level zero with no manager', () => {
    const fresh = freshGameState({ saveId: 'old', economyVersion: 1, wallMs: 0 });
    const legacy = {
      ...(JSON.parse(encodeSave(fresh)) as object),
      schemaVersion: 1,
      businesses: [{ definitionId: 'vending', capitalizedSpendCents: '25000' }],
    };
    expect(migratedState(JSON.stringify(legacy)).businesses).toEqual([
      {
        definitionId: 'vending',
        levels: { capacity: 0, quality: 0, efficiency: 0 },
        managerOwned: false,
        capitalizedSpendCents: dollars('250'),
      },
    ]);
  });
});
