import { dollarPrice, dollars, quantityMicrounits, units } from './money';
import {
  emptyPosition,
  largestQuantityWithin,
  markPosition,
  quoteTrade,
  settleTrade,
} from './trading';

const STOCK_FEE_BPS = 25;

const at = (price: string) => ({ price: dollarPrice(price), feeBps: STOCK_FEE_BPS });

describe('trade quote', () => {
  it('charges a buy its notional plus a 25 bps fee rounded up', () => {
    expect(quoteTrade({ side: 'buy', quantity: units('10') }, at('10'))).toEqual({
      side: 'buy',
      quantity: units('10'),
      price: dollarPrice('10'),
      notionalCents: dollars('100'),
      feeCents: dollars('0.25'),
      cashChangeCents: dollars('-100.25'),
    });
  });
});

describe('position settlement (AC14)', () => {
  it('buy 10 @ $10 then sell 4 @ $12 realizes $7.78 and leaves $60.15 basis', () => {
    const bought = settleTrade(
      emptyPosition('prism'),
      quoteTrade({ side: 'buy', quantity: units('10') }, at('10')),
    );
    expect(bought).toEqual({
      instrumentId: 'prism',
      quantity: units('10'),
      remainingBasisCents: dollars('100.25'),
      realizedProfitCents: dollars('0'),
    });
    const sale = quoteTrade({ side: 'sell', quantity: units('4') }, at('12'));
    expect([sale.notionalCents, sale.feeCents, sale.cashChangeCents]).toEqual([
      dollars('48'),
      dollars('0.12'),
      dollars('47.88'),
    ]);
    const after = settleTrade(bought, sale);
    expect(after).toEqual({
      instrumentId: 'prism',
      quantity: units('6'),
      remainingBasisCents: dollars('60.15'),
      realizedProfitCents: dollars('7.78'),
    });
    expect(markPosition(after, dollarPrice('12'))).toEqual({
      valueCents: dollars('72'),
      unrealizedCents: dollars('11.85'),
    });
  });

  it('lets the final sale consume all remaining basis', () => {
    const bought = settleTrade(
      emptyPosition('prism'),
      quoteTrade({ side: 'buy', quantity: units('3') }, at('3.33')),
    );
    const third = quoteTrade({ side: 'sell', quantity: units('1') }, at('3'));
    const rest = quoteTrade({ side: 'sell', quantity: units('2') }, at('3'));
    const closed = settleTrade(settleTrade(bought, third), rest);
    expect(closed.quantity).toBe(units('0'));
    expect(closed.remainingBasisCents).toBe(dollars('0'));
    expect(closed.realizedProfitCents).toBe(dollars('-1.05'));
  });
});

const sellWithin = (cash: string) =>
  largestQuantityWithin({ side: 'sell', cashCents: dollars(cash), holding: units('6') }, at('12'));

describe('largest quantity within a cash amount (AC15)', () => {
  it('buys exactly 10 shares at $10 with $100.25, fee included', () => {
    expect(largestQuantityWithin({ side: 'buy', cashCents: dollars('100.25') }, at('10'))).toBe(
      units('10'),
    );
  });

  it.each([
    ['0.000001', '1'],
    ['0.37', '1,000'],
    ['10', '100.24'],
    ['25.123457', '5,000'],
    ['3,333.333333', '123,456.78'],
  ])('never debits more than the cash at $%s with $%s', (quote, cash) => {
    const budget = { side: 'buy', cashCents: dollars(cash) } as const;
    const quantity = largestQuantityWithin(budget, at(quote));
    const debit = (amount: bigint) =>
      0n -
      quoteTrade({ side: 'buy', quantity: quantityMicrounits(amount) }, at(quote)).cashChangeCents;
    expect(debit(quantity)).toBeLessThanOrEqual(dollars(cash));
    expect(debit(quantity + 1n)).toBeGreaterThan(dollars(cash));
  });

  it('sells the most shares that bring in at most the amount, capped at the holding', () => {
    expect(sellWithin('47.88')).toBe(units('4.001666'));
    expect(sellWithin('1,000')).toBe(units('6'));
  });
});
