import type { PriceMicros } from './money';
import type { MarketRules } from './marketRules';

const HOUR_MS = 3_600_000;

export type Ohlc = {
  readonly open: PriceMicros;
  readonly high: PriceMicros;
  readonly low: PriceMicros;
  readonly close: PriceMicros;
};

export type MinuteObservation = {
  readonly assetId: string;
  readonly tick: number;
  readonly price: PriceMicros;
};

export type HourlyCandle = Ohlc & { readonly assetId: string; readonly hour: number };

export type MarketHistory = {
  readonly minutes: readonly MinuteObservation[];
  readonly hours: readonly HourlyCandle[];
  readonly keepFrom: { readonly minuteTick: number; readonly hour: number };
};

export type Candles = Readonly<Record<string, Ohlc>>;

export function hourOfTick(tick: number, rules: Pick<MarketRules, 'tickMs'>): number {
  return Math.floor((tick * rules.tickMs) / HOUR_MS);
}

const higher = (a: PriceMicros, b: PriceMicros) => (a > b ? a : b);
const lower = (a: PriceMicros, b: PriceMicros) => (a < b ? a : b);

export function openCandle(price: PriceMicros): Ohlc {
  return { open: price, high: price, low: price, close: price };
}

export function extendCandle(candle: Ohlc, price: PriceMicros): Ohlc {
  return {
    open: candle.open,
    high: higher(candle.high, price),
    low: lower(candle.low, price),
    close: price,
  };
}

export function closedCandles(candles: Candles, hour: number): HourlyCandle[] {
  return Object.entries(candles).map(([assetId, candle]) => ({
    assetId,
    hour,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

export function trimmedHistory(
  history: Pick<MarketHistory, 'minutes' | 'hours'>,
  at: { tick: number; rules: MarketRules },
): MarketHistory {
  const keepFrom = {
    minuteTick: at.tick - at.rules.minuteHistoryLength + 1,
    hour: hourOfTick(at.tick, at.rules) - at.rules.hourlyHistoryLength,
  };
  return {
    minutes: history.minutes.filter((minute) => minute.tick >= keepFrom.minuteTick),
    hours: history.hours.filter((candle) => candle.hour >= keepFrom.hour),
    keepFrom,
  };
}
