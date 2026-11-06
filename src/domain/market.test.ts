import {
  advanceMarket,
  freshMarket,
  quoteOf,
  type MarketEconomy,
  type MarketRules,
} from './market';
import { dollarPrice } from './money';

const quiet = {
  commonShockBps: 0,
  sectorShockBps: 0,
  regimeDriftBps: 0,
  eventDriftBps: 0,
  eventDurationTicks: 10,
};

const QUIET_RULES: MarketRules = {
  tickMs: 60_000,
  regimeEveryTicks: 30,
  regimeChancePercent: { bear: 0, neutral: 100, bull: 0 },
  eventEveryTicks: 30,
  eventChancePercent: { asset: 50, sector: 25, market: 25 },
  stocks: quiet,
  crypto: quiet,
  anchorPullBps: 0,
  anchorClampBps: 25,
  totalReturnClampBps: 2000,
  minuteHistoryLength: 480,
  hourlyHistoryLength: 720,
};

function economy(rules: Partial<MarketRules> = {}): MarketEconomy {
  return {
    rules: { ...QUIET_RULES, ...rules },
    instruments: [
      {
        id: 'hundred',
        market: 'stocks',
        sector: 'finance',
        initialPrice: dollarPrice('100'),
        assetShockBps: 0,
      },
      {
        id: 'twin',
        market: 'stocks',
        sector: 'finance',
        initialPrice: dollarPrice('100'),
        assetShockBps: 0,
      },
      {
        id: 'ten',
        market: 'stocks',
        sector: 'energy',
        initialPrice: dollarPrice('10'),
        assetShockBps: 0,
      },
      {
        id: 'dime',
        market: 'crypto',
        sector: undefined,
        initialPrice: dollarPrice('0.10'),
        assetShockBps: 0,
      },
    ],
  };
}

describe('advancing the market', () => {
  it('applies the regime drift every tick', () => {
    const bull = economy({
      regimeChancePercent: { bear: 0, neutral: 0, bull: 100 },
      stocks: { ...quiet, regimeDriftBps: 3 },
    });
    const { market } = advanceMarket(freshMarket('seed-1'), { toTick: 2, economy: bull });
    expect(market.tick).toBe(2);
    expect(quoteOf(market, bull.instruments[0]!)).toBe(dollarPrice('100.060009'));
    expect(quoteOf(market, bull.instruments[3]!)).toBe(dollarPrice('0.10'));
  });

  it('pulls weakly toward the initial price, clamped to 25 bps', () => {
    const anchored = economy({ anchorPullBps: 5 });
    const start = {
      ...freshMarket('seed-1'),
      quotes: { hundred: dollarPrice('700'), ten: dollarPrice('5') },
    };
    const { market } = advanceMarket(start, { toTick: 1, economy: anchored });
    expect(quoteOf(market, anchored.instruments[0]!)).toBe(dollarPrice('698.25'));
    expect(quoteOf(market, anchored.instruments[2]!)).toBe(dollarPrice('5.001'));
  });

  it('clamps a tick return to ±2,000 bps', () => {
    const wild = economy({ stocks: { ...quiet, commonShockBps: 9000 } });
    const moved = Array.from({ length: 50 }, (_, index) => {
      const start = freshMarket(`seed-${index}`);
      return quoteOf(
        advanceMarket(start, { toTick: 1, economy: wild }).market,
        wild.instruments[2]!,
      );
    });
    const micros = moved.map(Number);
    expect(Math.min(...micros)).toBe(Number(dollarPrice('8')));
    expect(Math.max(...micros)).toBe(Number(dollarPrice('12')));
  });

  it('moves stocks in one sector together', () => {
    const sectors = economy({ stocks: { ...quiet, sectorShockBps: 10 } });
    const { market } = advanceMarket(freshMarket('seed-1'), { toTick: 5, economy: sectors });
    expect(market.quotes['hundred']).not.toBe(dollarPrice('100'));
    expect(market.quotes['twin']).toBe(market.quotes['hundred']!);
    expect(market.quotes['dime']).toBe(dollarPrice('0.10'));
  });

  it('runs one company event per window, moving one stock by 30 bps for 10 ticks', () => {
    const eventful = economy({
      eventChancePercent: { asset: 100, sector: 0, market: 0 },
      stocks: { ...quiet, eventDriftBps: 30 },
    });
    const moves = [1, 9].map((toTick) => {
      const { market } = advanceMarket(freshMarket('seed-1'), { toTick, economy: eventful });
      return eventful.instruments.filter(
        (instrument) => quoteOf(market, instrument) !== instrument.initialPrice,
      );
    });
    expect(moves[0]).toHaveLength(1);
    expect(moves[1]).toEqual(moves[0]);
    const [moved] = moves[0]!;
    const after = (toTick: number) =>
      quoteOf(advanceMarket(freshMarket('seed-1'), { toTick, economy: eventful }).market, moved!);
    expect(after(9)).not.toBe(after(8));
    expect(after(10)).toBe(after(9));
  });
});

const lively = economy({
  regimeChancePercent: { bear: 25, neutral: 50, bull: 25 },
  stocks: {
    ...quiet,
    commonShockBps: 20,
    sectorShockBps: 10,
    regimeDriftBps: 3,
    eventDriftBps: 30,
  },
  crypto: {
    ...quiet,
    commonShockBps: 80,
    regimeDriftBps: 8,
    eventDriftBps: 100,
    eventDurationTicks: 6,
  },
  anchorPullBps: 5,
});

describe('crypto events', () => {
  it('turn the sector share into a coin event, since coins have no sector', () => {
    const coinOnly = economy({
      eventChancePercent: { asset: 0, sector: 100, market: 0 },
      crypto: { ...quiet, eventDriftBps: 100 },
    });
    const { market } = advanceMarket(freshMarket('seed-1'), { toTick: 1, economy: coinOnly });
    expect([dollarPrice('0.101'), dollarPrice('0.099')]).toContain(market.quotes['dime']);
  });
});

describe('market history', () => {
  it('gives the same prices and history whether advanced in pieces or at once', () => {
    const once = advanceMarket(freshMarket('seed-1'), { toTick: 130, economy: lively });
    const first = advanceMarket(freshMarket('seed-1'), { toTick: 37, economy: lively });
    const second = advanceMarket(first.market, { toTick: 130, economy: lively });
    expect(second.market).toEqual(once.market);
    expect([...first.history.minutes, ...second.history.minutes]).toEqual(once.history.minutes);
    expect([...first.history.hours, ...second.history.hours]).toEqual(once.history.hours);
  });

  it('records each tick as a minute observation; hourly candles open at the last close', () => {
    const { history } = advanceMarket(freshMarket('seed-1'), { toTick: 130, economy: lively });
    const minutes = history.minutes.filter((minute) => minute.assetId === 'ten');
    expect(minutes.map((minute) => minute.tick)).toEqual(
      Array.from({ length: 130 }, (_, i) => i + 1),
    );
    const hourOne = minutes.slice(58, 119).map((minute) => minute.price);
    const candles = history.hours.filter((candle) => candle.assetId === 'ten');
    expect(candles.map((candle) => candle.hour)).toEqual([0, 1]);
    expect(candles[0]!.open).toBe(dollarPrice('10'));
    expect(candles[1]).toEqual({
      assetId: 'ten',
      hour: 1,
      open: hourOne[0],
      high: BigInt(Math.max(...hourOne.map(Number))),
      low: BigInt(Math.min(...hourOne.map(Number))),
      close: hourOne[60],
    });
  });

  it('keeps only the newest observations, trimming by tick and hour', () => {
    const short = {
      ...lively,
      rules: { ...lively.rules, minuteHistoryLength: 50, hourlyHistoryLength: 1 },
    };
    const { history } = advanceMarket(freshMarket('seed-1'), { toTick: 130, economy: short });
    const tenMinutes = history.minutes.filter((minute) => minute.assetId === 'ten');
    expect(tenMinutes.map((minute) => minute.tick)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 81),
    );
    expect(history.hours.map((candle) => candle.hour)).toEqual([1, 1, 1, 1]);
    expect(history.keepFrom).toEqual({ minuteTick: 81, hour: 1 });
  });
});
