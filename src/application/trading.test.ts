import type { TradeSide } from '@/domain/tradeQuotes';
import { levelZeroBusiness } from '@/domain/businessQuotes';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, units, type QuantityMicrounits } from '@/domain/money';

import type { Game } from './game';
import { decodeSave, encodeSave } from './saveFormat';
import { startTestGameFrom, type TestGame } from './testGame';

const ONE_MINUTE_MS = 60_000;

const trade = (
  game: Game,
  order: { side: TradeSide; quantity: QuantityMicrounits; quotedTick?: number; assetId?: string },
) =>
  game.dispatch({
    id: game.createCommandId(),
    command: {
      type: 'ExecuteTrade',
      assetId: order.assetId ?? 'prism',
      side: order.side,
      quantity: order.quantity,
      quotedTick: order.quotedTick ?? game.getSnapshot().state.market.tick,
    },
  });

function startWith(cash: string, overrides: Partial<GameState> = {}): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'trader', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars(cash),
    tradingUnlocked: true,
    ...overrides,
  });
}

const position = (game: Game) =>
  game.getSnapshot().state.positions.find((held) => held.instrumentId === 'prism');

describe('trading a stock', () => {
  it('buys at the current quote, adds the fee to basis and survives a restart', async () => {
    const session = await startWith('1,000');
    expect(await trade(session.game, { side: 'buy', quantity: units('4') })).toEqual({
      ok: true,
      revision: 1,
      cashChangeCents: dollars('-100.25'),
    });
    const { game } = await session.restart();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('899.75'));
    expect(position(game)).toEqual({
      instrumentId: 'prism',
      quantity: units('4'),
      remainingBasisCents: dollars('100.25'),
      realizedProfitCents: dollars('0'),
    });
  });

  it('sells part of a position and books the realized result', async () => {
    const session = await startWith('1,000');
    await trade(session.game, { side: 'buy', quantity: units('10') });
    const sold = await trade(session.game, { side: 'sell', quantity: units('4') });
    expect(sold).toEqual({ ok: true, revision: 2, cashChangeCents: dollars('99.75') });
    expect(position(session.game)).toEqual({
      instrumentId: 'prism',
      quantity: units('6'),
      remainingBasisCents: dollars('150.38'),
      realizedProfitCents: dollars('-0.50'),
    });
  });

  it('counts positions at their marked value in net worth', async () => {
    const held = {
      instrumentId: 'prism',
      quantity: units('100'),
      remainingBasisCents: dollars('2,000'),
      realizedProfitCents: dollars('0'),
    };
    const session = await startWith('1,000', { positions: [held] });
    await session.game.checkpoint();
    expect<bigint>(session.game.getSnapshot().state.peakNetWorthCents).toBe(dollars('3,500'));
  });
});

describe('trading a coin', () => {
  it('charges the 50 bps crypto fee and keeps sub-cent coin prices exact', async () => {
    const session = await startWith('1,000');
    const bought = await trade(session.game, {
      side: 'buy',
      quantity: units('1,000'),
      assetId: 'wag',
    });
    expect(bought).toEqual({ ok: true, revision: 1, cashChangeCents: dollars('-100.50') });
    const sold = await trade(session.game, {
      side: 'sell',
      quantity: units('400'),
      assetId: 'wag',
    });
    expect(sold).toEqual({ ok: true, revision: 2, cashChangeCents: dollars('39.80') });
    const { game } = await session.restart();
    expect(game.getSnapshot().state.positions).toEqual([
      {
        instrumentId: 'wag',
        quantity: units('600'),
        remainingBasisCents: dollars('60.30'),
        realizedProfitCents: dollars('-0.40'),
      },
    ]);
  });
});

describe('trade refusals', () => {
  it('refuses a quote from an earlier market tick with STALE_QUOTE (AC16)', async () => {
    const session = await startWith('1,000');
    session.clock.advance(ONE_MINUTE_MS);
    const outcome = await trade(session.game, {
      side: 'buy',
      quantity: units('1'),
      quotedTick: 0,
    });
    expect(outcome).toEqual({ ok: false, error: 'STALE_QUOTE' });
    expect<bigint>(session.game.getSnapshot().state.cashCents).toBe(dollars('1,000'));
    expect(position(session.game)).toBeUndefined();
  });

  it('refuses selling more than the holding with INSUFFICIENT_HOLDING', async () => {
    const session = await startWith('1,000');
    await trade(session.game, { side: 'buy', quantity: units('2') });
    expect(await trade(session.game, { side: 'sell', quantity: units('2.000001') })).toEqual({
      ok: false,
      error: 'INSUFFICIENT_HOLDING',
    });
  });

  it('refuses a zero quantity with INVALID_QUANTITY', async () => {
    const session = await startWith('1,000');
    expect(await trade(session.game, { side: 'buy', quantity: units('0') })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('refuses a buy under $1 notional but lets a full-position sell clear it', async () => {
    const session = await startWith('1,000');
    expect(await trade(session.game, { side: 'buy', quantity: units('0.03') })).toEqual({
      ok: false,
      error: 'BELOW_MINIMUM',
    });
    await trade(session.game, { side: 'buy', quantity: units('1.03') });
    expect(await trade(session.game, { side: 'sell', quantity: units('1') })).toMatchObject({
      ok: true,
    });
    expect(await trade(session.game, { side: 'sell', quantity: units('0.01') })).toEqual({
      ok: false,
      error: 'BELOW_MINIMUM',
    });
    expect(await trade(session.game, { side: 'sell', quantity: units('0.03') })).toMatchObject({
      ok: true,
    });
    expect(position(session.game)?.quantity).toBe(units('0'));
  });

  it('refuses a buy beyond cash with INSUFFICIENT_CASH and spends nothing', async () => {
    const session = await startWith('100');
    expect(await trade(session.game, { side: 'buy', quantity: units('4') })).toEqual({
      ok: false,
      error: 'INSUFFICIENT_CASH',
    });
    expect<bigint>(session.game.getSnapshot().state.cashCents).toBe(dollars('100'));
  });
});

describe('opening the markets', () => {
  it('refuses trades with TRADING_LOCKED until the first business purchase', async () => {
    const session = await startWith('1,000', { tradingUnlocked: false });
    expect(await trade(session.game, { side: 'buy', quantity: units('1') })).toEqual({
      ok: false,
      error: 'TRADING_LOCKED',
    });
    await session.game.dispatch({
      id: 'buy-vending',
      command: { type: 'BuyBusiness', businessId: 'vending' },
    });
    await session.game.dispatch({
      id: 'sell-vending',
      command: { type: 'SellBusiness', businessId: 'vending' },
    });
    expect(await trade(session.game, { side: 'buy', quantity: units('1') })).toMatchObject({
      ok: true,
    });
  });
});

describe('watchlist', () => {
  it('adds and removes an asset and keeps it across restarts', async () => {
    const session = await startWith('0', { tradingUnlocked: false });
    const watch = (assetId: string, watched: boolean) =>
      session.game.dispatch({
        id: session.game.createCommandId(),
        command: { type: 'SetWatchlist', assetId, watched },
      });
    await watch('prism', true);
    await watch('wag', true);
    await watch('prism', false);
    const { game } = await session.restart();
    expect(game.getSnapshot().state.watchlist).toEqual(['wag']);
  });
});

function schemaV2Save(businesses: GameState['businesses']): string {
  const fresh = freshGameState({ saveId: 'old', economyVersion: 1, wallMs: 0 });
  const {
    tradingUnlocked: _unlocked,
    positions: _positions,
    watchlist: _watchlist,
    ...older
  } = { ...fresh, businesses, schemaVersion: 2 };
  return encodeSave(older as GameState);
}

const decodedState = (text: string): GameState | undefined => {
  const decoded = decodeSave(text);
  return 'state' in decoded ? decoded.state : undefined;
};

describe('saves from before trading', () => {
  it('migrate from schema 2, opening trading when a business is already owned', () => {
    const owner = decodeSave(schemaV2Save([levelZeroBusiness('vending')]));
    expect(owner).toMatchObject({
      status: 'migrated',
      fromVersion: 2,
      state: { schemaVersion: 6, tradingUnlocked: true, positions: [], watchlist: [] },
    });
    expect(decodedState(schemaV2Save([]))?.tradingUnlocked).toBe(false);
  });

  it('round-trip positions as exact microunits and cents', () => {
    const fresh = freshGameState({ saveId: 'saved', economyVersion: 1, wallMs: 0 });
    const positions = [
      {
        instrumentId: 'wag',
        quantity: units('123456789.000001'),
        remainingBasisCents: dollars('12,345,678.91'),
        realizedProfitCents: dollars('-3.50'),
      },
    ];
    expect(decodedState(encodeSave({ ...fresh, positions }))?.positions).toEqual(positions);
  });
});
