import { dollarPrice, priceMicros } from '@/domain/money';

import { priceChart } from './priceChart';

const MINUTE_MS = 60_000;
const price = (tick: number) => priceMicros(1_000_000 + tick * 1_000);
const minutes = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    assetId: 'wag',
    tick: from + i,
    price: price(from + i),
  }));

const asset = { initialPrice: dollarPrice('1'), tickMs: MINUTE_MS };

describe('a price chart', () => {
  it('shows the past 60 market minutes with change, high and low', () => {
    const chart = priceChart(
      { minutes: minutes(1, 100), hours: [] },
      { ...asset, range: '1h', tick: 100, price: price(100) },
    );
    expect(chart).toMatchObject({
      spanMs: 60 * MINUTE_MS,
      first: dollarPrice('1.04'),
      last: dollarPrice('1.10'),
      high: dollarPrice('1.10'),
      low: dollarPrice('1.04'),
      changeBps: 576,
    });
    expect(chart.points).toHaveLength(61);
    expect(chart.points[0]).toEqual({ x: 0, y: 0 });
    expect(chart.points[60]).toEqual({ x: 1, y: 1 });
  });

  it('starts a new save at its listing price and shows the range it has', () => {
    const chart = priceChart(
      { minutes: minutes(1, 5), hours: [] },
      { ...asset, range: '8h', tick: 5, price: price(5) },
    );
    expect(chart).toMatchObject({ spanMs: 5 * MINUTE_MS, first: dollarPrice('1') });
    expect(chart.points).toHaveLength(6);
  });

  it('shows one flat point before the market first moves', () => {
    const chart = priceChart(
      { minutes: [], hours: [] },
      { ...asset, range: '1h', tick: 0, price: dollarPrice('1') },
    );
    expect(chart).toMatchObject({ spanMs: 0, changeBps: 0 });
    expect(chart.points).toEqual([{ x: 0, y: 0.5 }]);
  });

  it('adds the latest quote when history has not caught up yet', () => {
    const chart = priceChart(
      { minutes: minutes(1, 9), hours: [] },
      { ...asset, range: '1h', tick: 10, price: dollarPrice('2') },
    );
    expect(chart).toMatchObject({ last: dollarPrice('2'), spanMs: 10 * MINUTE_MS });
  });

  it('charts 30 market days from hourly closes', () => {
    const candle = (hour: number) => ({
      assetId: 'wag',
      hour,
      open: price(hour * 60),
      high: dollarPrice('9'),
      low: dollarPrice('0.5'),
      close: price(hour * 60 + 59),
    });
    const chart = priceChart(
      { minutes: minutes(1, 190), hours: [candle(0), candle(1), candle(2)] },
      { ...asset, range: '30d', tick: 190, price: price(190) },
    );
    expect(chart).toMatchObject({
      spanMs: 190 * MINUTE_MS,
      first: dollarPrice('1'),
      last: dollarPrice('1.19'),
      high: dollarPrice('9'),
      low: dollarPrice('0.5'),
    });
    expect(chart.points).toHaveLength(5);
  });
});
