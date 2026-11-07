import type { PropertyTrack } from '@/domain/propertyQuotes';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const ONE_MINUTE_MS = 60_000;
const HALF_MINUTE_MS = 30_000;

const buy = (game: Game, propertyId = 'studio', id = `buy-${propertyId}`) =>
  game.dispatch({ id, command: { type: 'BuyProperty', propertyId } });

const setRented = (game: Game, rented: boolean, propertyId = 'studio') =>
  game.dispatch({
    id: `rent-${propertyId}-${rented}-${game.createCommandId()}`,
    command: { type: 'SetRentalStatus', propertyId, rented },
  });

const sell = (game: Game, propertyId = 'studio') =>
  game.dispatch({ id: `sell-${propertyId}`, command: { type: 'SellProperty', propertyId } });

const upgrade = (
  game: Game,
  order: { track: PropertyTrack; fromLevel: number; propertyId?: string; id?: string },
) =>
  game.dispatch({
    id: order.id ?? `upgrade-${order.track}-${order.fromLevel}`,
    command: {
      type: 'UpgradeProperty',
      propertyId: order.propertyId ?? 'studio',
      track: order.track,
      fromLevel: order.fromLevel,
    },
  });

async function startWith(cash: string): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
  });
}

async function waitAndSave(session: TestGame, ms: number): Promise<void> {
  session.clock.advance(ms);
  await session.game.checkpoint();
}

const cash = (game: Game): bigint => game.getSnapshot().state.cashCents;

describe('buying a property (RE01)', () => {
  it('spends the catalog price and starts vacant with no upkeep', async () => {
    const session = await startWith('20,000');
    expect(await buy(session.game)).toEqual({
      ok: true,
      revision: 1,
      cashChangeCents: dollars('-20,000'),
    });
    await waitAndSave(session, ONE_MINUTE_MS);
    const { state } = (await session.restart()).game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('0'));
    expect(state.properties).toEqual([
      {
        definitionId: 'studio',
        levels: { renovation: 0, furnishings: 0, systems: 0, expansion: 0 },
        rented: false,
        upgradeSpendCents: dollars('0'),
      },
    ]);
  });

  it('is open from the start but needs the full price and buys each listing once', async () => {
    const { game } = await startWith('39,999.99');
    expect(await buy(game, 'house')).toEqual({ ok: false, error: 'INSUFFICIENT_CASH' });
    await buy(game);
    expect(await buy(game, 'studio', 'again')).toEqual({ ok: false, error: 'ALREADY_OWNED' });
    expect<bigint>(cash(game)).toBe(dollars('19,999.99'));
  });
});

describe('renting a property (RE02, RE05)', () => {
  it('pays rent minus upkeep once rented, and keeps it across a restart', async () => {
    const session = await startWith('20,000');
    await buy(session.game);
    expect(await setRented(session.game, true)).toMatchObject({ ok: true });
    await waitAndSave(session, ONE_MINUTE_MS);
    const restarted = await session.restart();
    await waitAndSave(restarted, ONE_MINUTE_MS);
    expect<bigint>(cash(restarted.game)).toBe(dollars('200'));
    expect<bigint>(restarted.game.getSnapshot().state.income.rentEarningsCents).toBe(
      dollars('200'),
    );
  });

  it('stops rent and upkeep at the settled unrent time (AC13)', async () => {
    const session = await startWith('20,000');
    await buy(session.game);
    await setRented(session.game, true);
    session.clock.advance(HALF_MINUTE_MS);
    expect(await setRented(session.game, false)).toMatchObject({ ok: true });
    expect<bigint>(cash(session.game)).toBe(dollars('50'));
    await waitAndSave(session, ONE_MINUTE_MS);
    expect<bigint>(cash(session.game)).toBe(dollars('50'));
    expect(session.game.getSnapshot().state.properties[0]).toMatchObject({ rented: false });
  });

  it('refuses to rent a listing the player does not own', async () => {
    const { game } = await startWith('0');
    expect(await setRented(game, true)).toEqual({ ok: false, error: 'NOT_OWNED' });
  });
});

describe('upgrading a property (RE03, RE04)', () => {
  it('charges $2,000 for the first City Studio Renovation and raises rent at once', async () => {
    const session = await startWith('22,000');
    await buy(session.game);
    await setRented(session.game, true);
    expect(await upgrade(session.game, { track: 'renovation', fromLevel: 0 })).toEqual({
      ok: true,
      revision: 3,
      cashChangeCents: dollars('-2,000'),
    });
    await waitAndSave(session, ONE_MINUTE_MS);
    expect<bigint>(cash(session.game)).toBe(dollars('112'));
    expect(session.game.getSnapshot().state.properties[0]).toMatchObject({
      levels: { renovation: 1, furnishings: 0, systems: 0, expansion: 0 },
      upgradeSpendCents: dollars('2,000'),
    });
  });

  it('refuses a quote reviewed at an older level with STALE_QUOTE', async () => {
    const { game } = await startWith('30,000');
    await buy(game);
    await upgrade(game, { track: 'systems', fromLevel: 0 });
    expect(await upgrade(game, { track: 'systems', fromLevel: 0, id: 'again' })).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });

  it('offers Expansion only where the listing allows it', async () => {
    const { game } = await startWith('500,000');
    await buy(game);
    await buy(game, 'house');
    await buy(game, 'duplex');
    expect(await upgrade(game, { track: 'expansion', fromLevel: 0 })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
    expect(await upgrade(game, { track: 'expansion', fromLevel: 0, propertyId: 'house' })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
    expect(
      await upgrade(game, { track: 'expansion', fromLevel: 0, propertyId: 'duplex' }),
    ).toMatchObject({ ok: true, cashChangeCents: dollars('-62,500') });
  });

  it('refuses a track past its max level with MAX_LEVEL', async () => {
    const { game } = await startTestGameFrom({
      ...freshGameState({ saveId: 'saver', economyVersion: 1, wallMs: 0 }),
      cashCents: dollars('1,000,000'),
      properties: [
        {
          definitionId: 'studio',
          levels: { renovation: 10, furnishings: 0, systems: 0, expansion: 0 },
          rented: false,
          upgradeSpendCents: dollars('0'),
        },
      ],
    });
    expect(await upgrade(game, { track: 'renovation', fromLevel: 10 })).toEqual({
      ok: false,
      error: 'MAX_LEVEL',
    });
  });
});

describe('selling a property (RE06)', () => {
  it('pays $20,520 for a renovated City Studio, $22,000 invested (AC12)', async () => {
    const { game } = await startWith('22,000');
    await buy(game);
    await upgrade(game, { track: 'renovation', fromLevel: 0 });
    expect(await sell(game)).toEqual({
      ok: true,
      revision: 3,
      cashChangeCents: dollars('20,520'),
    });
    expect<bigint>(cash(game)).toBe(dollars('20,520'));
    expect(game.getSnapshot().state.properties).toEqual([]);
  });

  it('settles rent up to the sale and none after it (AC13)', async () => {
    const session = await startWith('20,000');
    await buy(session.game);
    await setRented(session.game, true);
    session.clock.advance(HALF_MINUTE_MS);
    expect(await sell(session.game)).toMatchObject({ ok: true });
    expect<bigint>(cash(session.game)).toBe(dollars('19,050'));
    await waitAndSave(session, ONE_MINUTE_MS);
    expect<bigint>(cash(session.game)).toBe(dollars('19,050'));
  });

  it('rebuys at the catalog price with upgrades reset', async () => {
    const { game } = await startWith('42,000');
    await buy(game);
    await upgrade(game, { track: 'renovation', fromLevel: 0 });
    await sell(game);
    expect(await buy(game, 'studio', 'rebuy')).toMatchObject({
      cashChangeCents: dollars('-20,000'),
    });
    expect(game.getSnapshot().state.properties).toEqual([
      {
        definitionId: 'studio',
        levels: { renovation: 0, furnishings: 0, systems: 0, expansion: 0 },
        rented: false,
        upgradeSpendCents: dollars('0'),
      },
    ]);
  });
});

describe('property net worth', () => {
  it('counts estimated value toward peak net worth', async () => {
    const session = await startWith('20,000');
    await buy(session.game);
    await setRented(session.game, true);
    await waitAndSave(session, ONE_MINUTE_MS);
    expect<bigint>(session.game.getSnapshot().state.peakNetWorthCents).toBe(dollars('20,100'));
  });
});
