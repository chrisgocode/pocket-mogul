import type { UpgradeTrack } from '@/domain/businessQuotes';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const ONE_MINUTE_MS = 60_000;

const buy = (game: Game, businessId = 'vending') =>
  game.dispatch({ id: `buy-${businessId}`, command: { type: 'BuyBusiness', businessId } });

const upgrade = (
  game: Game,
  order: { track: UpgradeTrack; fromLevel: number; id?: string; businessId?: string },
) =>
  game.dispatch({
    id: order.id ?? `upgrade-${order.track}-${order.fromLevel}`,
    command: {
      type: 'UpgradeBusiness',
      businessId: order.businessId ?? 'vending',
      track: order.track,
      fromLevel: order.fromLevel,
    },
  });

async function owningVendingWith(cash: string): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
  });
  await buy(session.game);
  return session;
}

describe('upgrading a business', () => {
  it('charges $50 for the first Capacity upgrade and nets $11.16 per minute (AC07)', async () => {
    const session = await owningVendingWith('300');
    expect(await upgrade(session.game, { track: 'capacity', fromLevel: 0 })).toEqual({
      ok: true,
      revision: 2,
      cashChangeCents: dollars('-50'),
    });
    session.clock.advance(ONE_MINUTE_MS);
    await session.game.checkpoint();
    const { state } = (await session.restart()).game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('11.16'));
    expect(state.businesses).toEqual([
      {
        definitionId: 'vending',
        levels: { capacity: 1, quality: 0, efficiency: 0 },
        managerOwned: false,
        capitalizedSpendCents: dollars('300'),
      },
    ]);
  });

  it('spends nothing when cash is short', async () => {
    const { game } = await owningVendingWith('299.99');
    expect(await upgrade(game, { track: 'capacity', fromLevel: 0 })).toEqual({
      ok: false,
      error: 'INSUFFICIENT_CASH',
    });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('49.99'));
  });

  it('refuses a quote reviewed at an older level with STALE_QUOTE', async () => {
    const { game } = await owningVendingWith('1,000');
    await upgrade(game, { track: 'quality', fromLevel: 0 });
    expect(await upgrade(game, { track: 'quality', fromLevel: 0, id: 'again' })).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });

  it('refuses a track past level 20 with MAX_LEVEL', async () => {
    const session = await startTestGameFrom({
      ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
      cashCents: dollars('1,000,000'),
      businesses: [
        {
          definitionId: 'vending',
          levels: { capacity: 20, quality: 0, efficiency: 0 },
          managerOwned: false,
          capitalizedSpendCents: dollars('250'),
        },
      ],
    });
    expect(await upgrade(session.game, { track: 'capacity', fromLevel: 20 })).toEqual({
      ok: false,
      error: 'MAX_LEVEL',
    });
  });

  it('refuses to upgrade a business the player does not own', async () => {
    const { game } = await owningVendingWith('5,000');
    expect(
      await upgrade(game, { track: 'capacity', fromLevel: 0, businessId: 'food_cart' }),
    ).toEqual({ ok: false, error: 'NOT_OWNED' });
  });
});
