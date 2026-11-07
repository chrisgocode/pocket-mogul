import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, units } from '@/domain/money';

import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function startWith(overrides: Partial<GameState> = {}): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'activity', economyVersion: 1, wallMs: 0 }),
    ...overrides,
  });
}

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

const kinds = async (game: Game) => (await game.readActivity()).map((entry) => entry.kind);

describe('activity history', () => {
  it('records purchases, upgrades and sales with their cash change, newest first', async () => {
    const { game } = await startWith({ cashCents: dollars('1,000') });
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    await run(game, {
      type: 'UpgradeBusiness',
      businessId: 'vending',
      track: 'capacity',
      fromLevel: 0,
    });
    await run(game, { type: 'SellBusiness', businessId: 'vending' });
    expect(await game.readActivity()).toEqual([
      expect.objectContaining({
        kind: 'sale',
        asset: 'business',
        assetId: 'vending',
        cashChangeCents: dollars('180'),
        sequence: 3,
      }),
      expect.objectContaining({
        kind: 'upgrade',
        target: 'business',
        track: 'capacity',
        level: 1,
        cashChangeCents: dollars('-50'),
      }),
      expect.objectContaining({ kind: 'purchase', cashChangeCents: dollars('-250') }),
    ]);
  });

  it('groups tap batches into one earnings entry, closed by the next activity', async () => {
    const { game } = await startWith();
    await run(game, { type: 'TapBatch', taps: 3 });
    await run(game, { type: 'TapBatch', taps: 2 });
    expect(await game.readActivity()).toEqual([]);
    await run(game, { type: 'PinGoal', goalId: 'first_business' });
    await run(game, { type: 'UpgradeWallet', fromLevel: 0 });
    expect(await game.readActivity()).toEqual([]);
    await run(game, { type: 'TapBatch', taps: 95 });
    await run(game, { type: 'UpgradeWallet', fromLevel: 0 });
    expect(await game.readActivity()).toEqual([
      expect.objectContaining({ kind: 'upgrade', target: 'wallet', level: 1 }),
      expect.objectContaining({ kind: 'earnings', taps: 100, tapCents: dollars('100') }),
    ]);
  });

  it('groups business income with taps rather than recording every checkpoint', async () => {
    const session = await startWith({ cashCents: dollars('250') });
    await run(session.game, { type: 'BuyBusiness', businessId: 'vending' });
    session.clock.advance(MINUTE_MS);
    await session.game.checkpoint();
    session.clock.advance(MINUTE_MS);
    await session.game.checkpoint();
    await run(session.game, { type: 'TapBatch', taps: 1 });
    expect(await kinds(session.game)).toEqual(['purchase']);
    expect(session.game.getSnapshot().state.activity.open).toEqual(
      expect.objectContaining({ taps: 1, businessCents: dollars('20') }),
    );
  });
});

describe('activity from markets and time away', () => {
  it('records trades and dividend payouts', async () => {
    const session = await startWith({ cashCents: dollars('500'), tradingUnlocked: true });
    const { game } = session;
    await run(game, {
      type: 'ExecuteTrade',
      assetId: 'prism',
      side: 'buy',
      quantity: units('10'),
      quotedTick: 0,
    });
    session.clock.advance(HOUR_MS);
    await game.checkpoint();
    expect(await game.readActivity()).toEqual([
      expect.objectContaining({ kind: 'dividend', cashChangeCents: dollars('0.20') }),
      expect.objectContaining({
        kind: 'trade',
        side: 'buy',
        assetId: 'prism',
        quantity: units('10'),
        cashChangeCents: dollars('-250.63'),
        realizedProfitCents: dollars('0'),
      }),
    ]);
  });

  it('records offline settlement as one entry by source', async () => {
    const session = await startWith({ cashCents: dollars('250') });
    await run(session.game, { type: 'BuyBusiness', businessId: 'vending' });
    const returned = await session.restart({ awayMs: 10 * MINUTE_MS });
    expect((await returned.game.readActivity())[0]).toEqual(
      expect.objectContaining({
        kind: 'offline',
        awayMs: 10 * MINUTE_MS,
        creditedMs: 10 * MINUTE_MS,
        earnings: { businesses: dollars('100'), rent: dollars('0'), dividends: dollars('0') },
      }),
    );
  });
});

describe('bounded activity history', () => {
  it('keeps the newest 2,000 entries while lifetime totals keep counting', async () => {
    const { game } = await startWith({ cashCents: dollars('20,000') });
    await run(game, { type: 'BuyProperty', propertyId: 'studio' });
    await Array.from({ length: 2000 }, (_, toggle) => toggle % 2 === 0).reduce<Promise<unknown>>(
      (previous, rented) =>
        previous.then(() => run(game, { type: 'SetRentalStatus', propertyId: 'studio', rented })),
      Promise.resolve(),
    );
    const history = await game.readActivity();
    expect(history).toHaveLength(2000);
    expect(history.at(0)?.sequence).toBe(2001);
    expect(history.at(-1)?.sequence).toBe(2);
    const { lifetime } = game.getSnapshot().state.activity;
    expect(lifetime.entries).toBe(2001);
    expect(lifetime.byKind).toEqual({
      earnings: 0,
      purchase: 1,
      sale: 0,
      upgrade: 0,
      rental: 2000,
      trade: 0,
      dividend: 0,
      offline: 0,
    });
    expect<bigint>(lifetime.spentCents).toBe(dollars('20,000'));
  });
});
