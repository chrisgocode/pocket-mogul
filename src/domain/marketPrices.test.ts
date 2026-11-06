import { dollarPrice, priceMicros } from './money';
import { applyReturn } from './marketPrices';

describe('applying a tick return', () => {
  it('moves a $0.10 asset by +100 bps to $0.101 (AC29)', () => {
    expect(applyReturn(dollarPrice('0.10'), 100)).toBe(dollarPrice('0.101'));
    expect(applyReturn(dollarPrice('25'), 100)).toBe(dollarPrice('25.25'));
  });

  it('rounds to the nearest microdollar, half upward', () => {
    expect(applyReturn(priceMicros(150), 100)).toBe(priceMicros(152));
    expect(applyReturn(priceMicros(149), 100)).toBe(priceMicros(150));
    expect(applyReturn(priceMicros(150), -100)).toBe(priceMicros(149));
  });

  it('never drops below one microdollar', () => {
    expect(applyReturn(priceMicros(1), -2000)).toBe(priceMicros(1));
  });
});
