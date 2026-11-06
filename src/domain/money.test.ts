import {
  divideRoundingUp,
  formatMoneyCompact,
  formatMoneyExact,
  formatPrice,
  formatPriceCompact,
  formatQuantity,
  formatRatePerMinute,
  moneyCents,
  parseMoneyCents,
  parsePriceMicros,
  parseQuantityMicrounits,
  priceMicros,
  quantityMicrounits,
  serializeUnits,
  units,
  dollars,
  dollarPrice,
} from './money';

describe('decimal literals', () => {
  it('converts dollars to cents exactly', () => {
    expect<bigint>(dollars('1,250')).toBe(125_000n);
    expect<bigint>(dollars('0.50')).toBe(50n);
    expect<bigint>(dollars('-3.5')).toBe(-350n);
    expect<bigint>(dollars('750,000,000')).toBe(75_000_000_000n);
  });

  it('converts prices and quantities to millionths', () => {
    expect<bigint>(dollarPrice('0.101')).toBe(101_000n);
    expect<bigint>(dollarPrice('0.000001')).toBe(1n);
    expect<bigint>(units('1.5')).toBe(1_500_000n);
  });

  it('rejects amounts finer than the unit', () => {
    expect(() => dollars('0.001')).toThrow(RangeError);
    expect(() => dollarPrice('0.0000001')).toThrow(RangeError);
    expect(() => dollars('0.010')).not.toThrow();
  });

  it('rejects malformed amounts', () => {
    for (const bad of ['', '1.', '.5', '1,25', '$5', '1e3', 'abc']) {
      expect(() => dollars(bad)).toThrow(SyntaxError);
    }
  });
});

describe('serialization', () => {
  it('round-trips beyond the safe integer range', () => {
    const huge = moneyCents(2n ** 80n + 7n);
    const text = serializeUnits(huge);
    expect(text).toBe('1208925819614629174706183');
    expect(parseMoneyCents(text)).toBe(huge);
    const saved: unknown = JSON.parse(JSON.stringify({ cash: text }));
    expect(saved).toEqual({ cash: text });
  });

  it('parses every unit from base-ten strings only', () => {
    expect(parsePriceMicros('101000')).toBe(priceMicros(101_000));
    expect(parseQuantityMicrounits('-5')).toBe(quantityMicrounits(-5));
    for (const bad of ['1.5', ' 1', '1_000', '0x10', '']) {
      expect(() => parseMoneyCents(bad)).toThrow(SyntaxError);
    }
  });

  it('refuses unsafe numbers when building from a Number', () => {
    expect(() => moneyCents(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
    expect(() => moneyCents(1.5)).toThrow(RangeError);
  });
});

describe('formatting', () => {
  it('formats exact cash to two decimals', () => {
    expect(formatMoneyExact(dollars('0'))).toBe('$0.00');
    expect(formatMoneyExact(dollars('210.25'))).toBe('$210.25');
    expect(formatMoneyExact(dollars('4,800'))).toBe('$4,800.00');
    expect(formatMoneyExact(dollars('-0.05'))).toBe('-$0.05');
  });

  it('formats exact cash beyond Number precision (AC24)', () => {
    const value = moneyCents(123_456_789_012_345_678_901n);
    expect(formatMoneyExact(value)).toBe('$1,234,567,890,123,456,789.01');
  });

  it('formats compact summaries, rounding toward zero', () => {
    expect(formatMoneyCompact(dollars('999.99'))).toBe('$999.99');
    expect(formatMoneyCompact(dollars('1,000'))).toBe('$1.00K');
    expect(formatMoneyCompact(dollars('1,239.99'))).toBe('$1.23K');
    expect(formatMoneyCompact(dollars('4,800,000'))).toBe('$4.80M');
    expect(formatMoneyCompact(dollars('750,000,000'))).toBe('$750.00M');
    expect(formatMoneyCompact(dollars('1,000,000,000'))).toBe('$1.00B');
    expect(formatMoneyCompact(dollars('-12,500'))).toBe('-$12.50K');
    expect(formatMoneyCompact(dollars('-12.5'))).toBe('-$12.50');
  });

  it('falls back to scientific notation past the named suffixes', () => {
    const pastTheLargestSuffix = moneyCents(123n * 10n ** 36n);
    expect(formatMoneyCompact(pastTheLargestSuffix)).toBe('$1.23e36');
  });

  it('formats prices with two to six decimals, so a ten-cent coin can show $0.101 (AC29)', () => {
    expect(formatPrice(dollarPrice('10'))).toBe('$10.00');
    expect(formatPrice(dollarPrice('0.101'))).toBe('$0.101');
    expect(formatPrice(dollarPrice('0.000001'))).toBe('$0.000001');
    expect(formatPrice(dollarPrice('1,234.5'))).toBe('$1,234.50');
  });

  it('formats quantities without trailing zeros', () => {
    expect(formatQuantity(units('10'))).toBe('10');
    expect(formatQuantity(units('0.5'))).toBe('0.5');
    expect(formatQuantity(units('1234.000001'))).toBe('1,234.000001');
  });

  it('puts the unit on every rate', () => {
    expect(formatRatePerMinute(dollars('11.16'), 'full')).toBe('$11.16/min');
  });
});

describe('divideRoundingUp', () => {
  it('rounds up and handles exact division', () => {
    expect(divideRoundingUp(10n, 3n)).toBe(4n);
    expect(divideRoundingUp(9n, 3n)).toBe(3n);
    expect(divideRoundingUp(0n, 7n)).toBe(0n);
  });
});

describe('compact quote prices', () => {
  it('round prices of a dollar or more to the nearest cent, half up', () => {
    expect(formatPriceCompact(dollarPrice('24.201984'))).toBe('$24.20');
    expect(formatPriceCompact(dollarPrice('41.745501'))).toBe('$41.75');
    expect(formatPriceCompact(dollarPrice('1,234.995'))).toBe('$1,235.00');
  });

  it('keep the sub-cent precision a price under a dollar needs', () => {
    expect(formatPriceCompact(dollarPrice('0.101'))).toBe('$0.101');
    expect(formatPriceCompact(dollarPrice('0.999999'))).toBe('$0.999999');
  });
});
