import type { HourlyCandle, MinuteObservation } from '@/domain/market';
import { changeBps } from '@/domain/marketPrices';
import type { PriceMicros } from '@/domain/money';

import type { AssetHistory } from './ports';

export type ChartRange = '1h' | '8h' | '30d';

const HOUR_MS = 3_600_000;
const EIGHT_HOURS_MS = 28_800_000;
const MINUTE_RANGE_MS: Record<Exclude<ChartRange, '30d'>, number> = {
  '1h': HOUR_MS,
  '8h': EIGHT_HOURS_MS,
};
const MIDDLE = 0.5;

type Point = { readonly tick: number; readonly price: PriceMicros };

export type ChartPoint = { readonly x: number; readonly y: number };

export type PriceChart = {
  readonly spanMs: number;
  readonly first: PriceMicros;
  readonly last: PriceMicros;
  readonly high: PriceMicros;
  readonly low: PriceMicros;
  readonly changeBps: number;
  readonly points: readonly ChartPoint[];
};

export type ChartRequest = {
  readonly range: ChartRange;
  readonly tick: number;
  readonly price: PriceMicros;
  readonly initialPrice: PriceMicros;
  readonly tickMs: number;
};

const higher = (a: PriceMicros, b: PriceMicros) => (a > b ? a : b);
const lower = (a: PriceMicros, b: PriceMicros) => (a < b ? a : b);

function fromListing(points: readonly Point[], request: ChartRequest): Point[] {
  const listing = { tick: 0, price: request.initialPrice };
  const startsAtListing = points.length === 0 ? request.tick === 0 : points[0]?.tick === 1;
  return startsAtListing ? [listing, ...points] : [...points];
}

function minutePoints(minutes: readonly MinuteObservation[], request: ChartRequest): Point[] {
  const range = request.range === '30d' ? '8h' : request.range;
  const fromTick = request.tick - MINUTE_RANGE_MS[range] / request.tickMs;
  const recent = minutes.filter((minute) => minute.tick >= fromTick);
  return fromListing(recent, request).filter((point) => point.tick >= fromTick);
}

function hourPoints(hours: readonly HourlyCandle[], request: ChartRequest): Point[] {
  const ticksPerHour = HOUR_MS / request.tickMs;
  const [first] = hours;
  const opening =
    first === undefined ? [] : [{ tick: first.hour * ticksPerHour, price: first.open }];
  const closes = hours.map((candle) => ({
    tick: (candle.hour + 1) * ticksPerHour - 1,
    price: candle.close,
  }));
  return [...opening, ...closes];
}

function withLatest(points: readonly Point[], request: ChartRequest): Point[] {
  const last = points.at(-1);
  const behind = last === undefined || last.tick < request.tick;
  return behind ? [...points, { tick: request.tick, price: request.price }] : [...points];
}

function extremes(points: readonly Point[], hours: readonly HourlyCandle[]) {
  const prices = points.map((point) => point.price);
  const highs = [...prices, ...hours.map((candle) => candle.high)];
  const lows = [...prices, ...hours.map((candle) => candle.low)];
  return { high: highs.reduce(higher), low: lows.reduce(lower) };
}

function plotted(points: readonly Point[], bounds: { high: PriceMicros; low: PriceMicros }) {
  const firstTick = points[0]?.tick ?? 0;
  const spanTicks = (points.at(-1)?.tick ?? 0) - firstTick;
  const spread = bounds.high - bounds.low;
  return points.map((point) => ({
    x: spanTicks === 0 ? 0 : (point.tick - firstTick) / spanTicks,
    y: spread === 0n ? MIDDLE : Number(point.price - bounds.low) / Number(spread),
  }));
}

export function priceChart(history: AssetHistory, request: ChartRequest): PriceChart {
  const hours = request.range === '30d' ? history.hours : [];
  const series =
    request.range === '30d' ? hourPoints(hours, request) : minutePoints(history.minutes, request);
  const points = withLatest(series.length === 0 ? fromListing([], request) : series, request);
  const first = points[0] ?? { tick: request.tick, price: request.price };
  const last = points.at(-1) ?? first;
  const bounds = extremes(points, hours);
  return {
    spanMs: (last.tick - first.tick) * request.tickMs,
    first: first.price,
    last: last.price,
    ...bounds,
    changeBps: changeBps(first.price, last.price),
    points: plotted(points, bounds),
  };
}
