import {
  advanceDividends,
  dividendPerHourCents,
  pendingDividendsCents,
  type DividendAccrual,
  type DividendHoldings,
} from './dividends';
import { dollars, units, type QuantityMicrounits } from './money';
import { emptyPosition } from './tradeQuotes';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const rates = { prism: dollars('0.02') };

const holding = (quantity: QuantityMicrounits, accruals: readonly DividendAccrual[] = []) => ({
  accruals,
  positions: [{ ...emptyPosition('prism'), quantity }],
});

const advance = (holdings: DividendHoldings, span: { fromMs: number; toMs: number }) =>
  advanceDividends(holdings, { ...span, rates });

describe('stock dividends', () => {
  it('pays a full simulation hour of entitlement at the hour boundary', () => {
    const paid = advance(holding(units('10')), { fromMs: 0, toMs: HOUR_MS });
    expect<bigint>(paid.paidCents).toBe(dollars('0.20'));
    expect<bigint>(pendingDividendsCents(paid.accruals)).toBe(dollars('0'));
  });

  it('holds part of an hour as pending until the boundary', () => {
    const accrued = advance(holding(units('10')), { fromMs: 0, toMs: 30 * MINUTE_MS });
    expect<bigint>(accrued.paidCents).toBe(dollars('0'));
    expect<bigint>(pendingDividendsCents(accrued.accruals)).toBe(dollars('0.10'));
  });

  it('pays what accrued before the boundary and keeps accruing after it', () => {
    const before = advance(holding(units('10')), { fromMs: 0, toMs: 30 * MINUTE_MS });
    const after = advance(holding(units('10'), before.accruals), {
      fromMs: 30 * MINUTE_MS,
      toMs: 90 * MINUTE_MS,
    });
    expect<bigint>(after.paidCents).toBe(dollars('0.20'));
    expect<bigint>(pendingDividendsCents(after.accruals)).toBe(dollars('0.10'));
  });

  it('pays every boundary crossed in one long advance', () => {
    const paid = advance(holding(units('10')), { fromMs: 0, toMs: 8 * HOUR_MS });
    expect<bigint>(paid.paidCents).toBe(dollars('1.60'));
  });

  it('keeps sub-cent entitlement so many small advances pay the same as one', () => {
    const minuteByMinute = Array.from({ length: 20 }, (_, minute) => minute).reduce(
      (accruals, minute) =>
        advance(holding(units('1.5'), accruals), {
          fromMs: minute * MINUTE_MS,
          toMs: (minute + 1) * MINUTE_MS,
        }).accruals,
      [] as readonly DividendAccrual[],
    );
    const once = advance(holding(units('1.5')), { fromMs: 0, toMs: 20 * MINUTE_MS });
    expect<bigint>(pendingDividendsCents(minuteByMinute)).toBe(dollars('0.01'));
    expect(minuteByMinute).toEqual(once.accruals);
  });

  it('pays entitlement that accrued before selling every share (AC18)', () => {
    const held = advance(holding(units('10')), { fromMs: 0, toMs: 30 * MINUTE_MS });
    const sold = advance(holding(units('0'), held.accruals), {
      fromMs: 30 * MINUTE_MS,
      toMs: HOUR_MS,
    });
    expect<bigint>(sold.paidCents).toBe(dollars('0.10'));
  });

  it('pays nothing for stocks without a dividend', () => {
    const paid = advanceDividends(holding(units('10')), {
      fromMs: 0,
      toMs: HOUR_MS,
      rates: { prism: dollars('0') },
    });
    expect<bigint>(paid.paidCents).toBe(dollars('0'));
    expect(paid.accruals).toEqual([]);
  });

  it('estimates the hourly dividend for a holding in whole cents', () => {
    expect<bigint>(dividendPerHourCents(units('2.5'), dollars('0.85'))).toBe(dollars('2.12'));
  });
});
