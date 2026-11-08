import { getContent } from '@/content';
import { ownedBusiness } from '@/domain/testRules';
import { vendingBusiness } from '@/domain/testVending';
import { dollars, dollarPrice } from '@/domain/money';
import { levelZeroProperty } from '@/domain/propertyQuotes';
import type { GameState } from '@/domain/gameState';
import { type GameSnapshot } from './game';
import { taxReturnOwner } from './taxTesting';
import { selectHomeAttention } from './homeAttention';
import { selectHomeGrowth } from './homeGrowth';
import { selectCashFlow } from './cashFlowView';
import { browseMarketQuotes } from './marketBrowse';
import { selectStockQuotes } from './marketsView';

const content = getContent();
const original = taxReturnOwner();
const snapshot = (patch: Partial<GameState> = {}): GameSnapshot => ({
  state: { ...original, ...patch },
  pendingTaps: 0,
  pendingBoostedTaps: 0,
  unsavedElapsedMs: 0,
  unsavedBoostMs: 0,
  tapBoostAd: 'loading',
  automaticAd: 'none',
  notice: { kind: 'none' },
});
const emptyVending = vendingBusiness(
  { office: { machines: 2, mix: 'balanced', stock: 0 } },
  { treasuryCents: dollars('10') },
);

describe('Studio attention and growth', () => {
  it('prioritizes stopped earnings, then filing, then vacant properties', () => {
    const attention = selectHomeAttention(
      snapshot({ businesses: [emptyVending], properties: [levelZeroProperty('studio')] }),
      content,
    );
    expect(attention.map((item) => item.kind)).toEqual(['business', 'taxes', 'property']);
    expect(attention[0]).toMatchObject({ title: 'Restock Vending Machine', section: 'mechanic' });
  });

  it('routes stock shortfalls to Treasury without spending cash', () => {
    const state = snapshot({ businesses: [{ ...emptyVending, treasuryCents: dollars('0') }] });
    expect(selectHomeAttention(state, content)[0]).toMatchObject({
      section: 'treasury',
      detail: '$4.00 treasury · deposit needed',
    });
    expect(state.state.cashCents).toBe(dollars('2000'));
  });

  it('guides reopening and removes the stock issue once full', () => {
    expect(
      selectHomeAttention(
        snapshot({ businesses: [ownedBusiness('vending', { status: 'closed' })] }),
        content,
      )[0],
    ).toMatchObject({ title: 'Reopen Vending Machine', section: 'treasury' });
    const full = vendingBusiness({ office: { machines: 2, mix: 'balanced', stock: 600 } });
    expect(
      selectHomeAttention(snapshot({ businesses: [full] }), content).map((item) => item.kind),
    ).toEqual(['taxes']);
  });

  it('suppresses growth while a return is waiting and respects stage eligibility', () => {
    expect(selectHomeGrowth(snapshot(), content)).toBeUndefined();
    const stage = ownedBusiness('vending', { stage: 1, units: 3, treasuryCents: dollars('600') });
    expect(
      selectHomeGrowth(snapshot({ tax: { status: 'notStarted' }, businesses: [stage] }), content),
    ).toMatchObject({ title: 'Advance Vending Machine', kind: 'business' });
    expect(
      selectHomeGrowth(
        snapshot({
          tax: { status: 'notStarted' },
          businesses: [ownedBusiness('vending', { treasuryCents: dollars('150') })],
        }),
        content,
      ),
    ).toMatchObject({ title: 'Grow Vending Machine' });
  });
});

describe('cash-flow forecast', () => {
  const debtState = {
    ...original,
    businesses: [ownedBusiness('vending')],
    tax: {
      ...original.tax,
      debts: [{ returnId: 1, principalCents: dollars('100'), fineCents: dollars('0') }],
      recoveryRemainder: 0n,
    },
  };

  it('quotes recovery from eligible cash rather than estimated filing tax', () => {
    const quoted = selectCashFlow(snapshot(debtState), content);
    expect(quoted).toEqual({
      grossCents: dollars('5'),
      recoveryCents: dollars('1.25'),
      netCents: dollars('3.75'),
    });
    expect(
      selectCashFlow(snapshot({ businesses: [ownedBusiness('vending')] }), content).netCents,
    ).toBe(dollars('5'));
  });

  it('uses the existing recovery remainder in the quoted receipt', () => {
    const state = snapshot({
      ...debtState,
      businesses: [ownedBusiness('vending', { priceLevel: 'premium' })],
      tax: { ...debtState.tax, recoveryRemainder: 9999n },
    });
    expect(selectCashFlow(state, content)).toEqual({
      grossCents: dollars('5.39'),
      recoveryCents: dollars('1.35'),
      netCents: dollars('4.04'),
    });
  });

  it('caps final recovery to the remaining debt and keeps the state immutable', () => {
    const state = snapshot({
      ...debtState,
      tax: {
        ...debtState.tax,
        debts: [{ returnId: 1, principalCents: dollars('0.03'), fineCents: dollars('0') }],
      },
    });
    expect(selectCashFlow(state, content).netCents).toBe(dollars('4.97'));
    expect(state.state.tax).toEqual({
      ...debtState.tax,
      debts: [{ returnId: 1, principalCents: dollars('0.03'), fineCents: dollars('0') }],
    });
  });
});

describe('market browsing', () => {
  const quotes = selectStockQuotes(
    snapshot({
      market: {
        ...original.market,
        quotes: { prism: dollarPrice('30'), brick: dollarPrice('10') },
      },
    }),
    content,
  );

  it('matches a ticker without case or whitespace sensitivity', () => {
    expect(
      browseMarketQuotes(quotes, { market: 'Stocks', search: '  przm ', sort: 'Name' }).map(
        (quote) => quote.asset.id,
      ),
    ).toEqual(['prism']);
    expect(browseMarketQuotes(quotes, { market: 'Crypto', search: '', sort: 'Name' })).toHaveLength(
      0,
    );
  });

  it('sorts a filtered copy by price without changing the source order', () => {
    const source = quotes.map((quote) => quote.asset.id);
    const sorted = browseMarketQuotes(quotes, { market: 'Stocks', search: '', sort: 'Price' });
    expect(sorted.slice(0, 2).map((quote) => quote.asset.id)).toEqual(['summit', 'atlas']);
    expect(quotes.map((quote) => quote.asset.id)).toEqual(source);
  });
});
