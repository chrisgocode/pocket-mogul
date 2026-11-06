import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { advanceMarket, freshMarket } from '@/domain/market';
import { dollarPrice } from '@/domain/money';

import { marketEconomy } from './economy';
import { decodeSave, encodeSave } from './saveFormat';
import { startTestGame, startTestGameFrom, type TestGame } from './testGame';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const quotes = (session: TestGame) => session.game.getSnapshot().state.market.quotes;

function expectedQuotes(seed: string, toTick: number) {
  const economy = marketEconomy(getContent());
  return advanceMarket(freshMarket(seed), { toTick, economy }).market.quotes;
}

describe('the seeded market', () => {
  it('starts every asset at its listed price with the save ID as its seed', async () => {
    const session = await startTestGame();
    const { market, saveId } = session.game.getSnapshot().state;
    expect(market.seed).toBe(saveId);
    expect(market.tick).toBe(0);
    expect(market.quotes).toEqual({});
  });

  it('moves prices once per market minute while playing', async () => {
    const session = await startTestGame();
    session.clock.advance(MINUTE_MS - 5_000);
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.market.tick).toBe(0);
    session.clock.advance(5_000);
    await session.game.checkpoint();
    expect(session.game.getSnapshot().state.market.tick).toBe(1);
    expect(quotes(session)).toEqual(expectedQuotes(session.game.getSnapshot().state.saveId, 1));
  });

  it('gives the same prices for the same seed and time across restarts and chart reads (AC17)', async () => {
    const played = await startTestGame();
    const { saveId } = played.game.getSnapshot().state;
    played.clock.advance(40 * MINUTE_MS);
    await played.game.readMarketHistory('prism');
    const restarted = await played.restart({ awayMs: 50 * MINUTE_MS });
    await restarted.game.readMarketHistory('wag');
    restarted.clock.advance(MINUTE_MS);
    await restarted.game.checkpoint();
    expect(restarted.game.getSnapshot().state.market.tick).toBe(91);
    expect(quotes(restarted)).toEqual(expectedQuotes(saveId, 91));
  });

  it('settles a market for at most the offline cap', async () => {
    const left = await startTestGameFrom(
      freshGameState({ saveId: 'away', economyVersion: 1, wallMs: 1_800_000_000_000 }),
    );
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    expect(back.game.getSnapshot().state.market.tick).toBe(480);
    expect(quotes(back)).toEqual(expectedQuotes('away', 480));
  });
});

describe('market history', () => {
  it('saves each closed minute and hour with the commit that closed it', async () => {
    const session = await startTestGame();
    session.clock.advance(2 * HOUR_MS + 5 * MINUTE_MS);
    await session.game.checkpoint();
    const history = await session.game.readMarketHistory('prism');
    expect(history.minutes.map((minute) => minute.tick)).toEqual(
      Array.from({ length: 125 }, (_, i) => i + 1),
    );
    expect(history.hours.map((candle) => candle.hour)).toEqual([0, 1]);
    expect(history.hours[0]!.open).toBe(dollarPrice('25'));
  });

  it('keeps 480 minutes and 720 hours, trimming the oldest by tick and hour', async () => {
    const left = await startTestGameFrom(
      freshGameState({ saveId: 'long', economyVersion: 1, wallMs: 1_800_000_000_000 }),
    );
    const back = await left.restart({ awayMs: 8 * HOUR_MS });
    const later = await back.restart({ awayMs: 10 * MINUTE_MS });
    const history = await later.game.readMarketHistory('wag');
    expect(history.minutes).toHaveLength(480);
    expect(history.minutes[0]!.tick).toBe(11);
    expect(history.minutes.at(-1)!.tick).toBe(490);
    expect(history.hours.map((candle) => candle.hour)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

const minutes = (ticks: number[]) => ({
  status: 'loaded',
  history: { minutes: ticks.map((tick) => ({ assetId: 'prism', tick })) },
});

function loadedFeed(session: TestGame, assetId: string) {
  const feed = session.game.marketHistory(assetId);
  const unsubscribe = feed.subscribe(() => undefined);
  return { feed, unsubscribe };
}

describe('a market history feed', () => {
  it('loads saved history on first subscribe, then follows each commit', async () => {
    const session = await startTestGame();
    session.clock.advance(3 * MINUTE_MS);
    await session.game.checkpoint();
    const { feed } = loadedFeed(session, 'prism');
    expect(feed.getSnapshot()).toEqual({ status: 'loading' });
    await session.game.flushTaps();
    expect(feed.getSnapshot()).toMatchObject(minutes([1, 2, 3]));
    session.clock.advance(MINUTE_MS);
    await session.game.checkpoint();
    expect(feed.getSnapshot()).toMatchObject(minutes([1, 2, 3, 4]));
    expect(session.game.marketHistory('prism')).toBe(feed);
  });

  it('reports a failed read instead of inventing prices', async () => {
    const session = await startTestGame();
    session.readFaults.failReads = true;
    const { feed } = loadedFeed(session, 'prism');
    await session.game.flushTaps();
    expect(feed.getSnapshot()).toEqual({ status: 'failed' });
  });
});

describe('saves from before markets', () => {
  it('load with a market seeded from the save ID, starting at the current market minute', () => {
    const fresh = freshGameState({ saveId: 'old', economyVersion: 1, wallMs: 0 });
    const { market: _market, ...legacy } = {
      ...fresh,
      clock: { simulationMs: 3 * HOUR_MS + 30_000, lastWallCheckpointMs: 0 },
    };
    expect(decodeSave(encodeSave(legacy as typeof fresh)).market).toEqual({
      seed: 'old',
      tick: 180,
      quotes: {},
      candles: {},
    });
  });

  it('round-trip prices and candles as exact microdollars', () => {
    const fresh = freshGameState({ saveId: 'saved', economyVersion: 1, wallMs: 0 });
    const price = dollarPrice('0.101');
    const market = {
      ...fresh.market,
      quotes: { wag: price },
      candles: { wag: { open: price, high: price, low: price, close: price } },
    };
    expect(decodeSave(encodeSave({ ...fresh, market })).market).toEqual(market);
  });
});
