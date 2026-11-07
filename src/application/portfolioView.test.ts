import { getContent } from '@/content';
import { levelZeroBusiness } from '@/domain/businessQuotes';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollarPrice, dollars, units } from '@/domain/money';
import { levelZeroProperty } from '@/domain/propertyQuotes';

import type { GameSnapshot } from './game';
import { selectPortfolio } from './portfolioView';

const fresh = freshGameState({ saveId: 'portfolio', economyVersion: 1, wallMs: 0 });

const holder: GameState = {
  ...fresh,
  cashCents: dollars('100'),
  businesses: [{ ...levelZeroBusiness('vending'), capitalizedSpendCents: dollars('300') }],
  properties: [{ ...levelZeroProperty('studio'), rented: true }],
  market: { ...fresh.market, quotes: { prism: dollarPrice('30') } },
  positions: [
    {
      instrumentId: 'prism',
      quantity: units('10'),
      remainingBasisCents: dollars('250.63'),
      realizedProfitCents: dollars('7.78'),
    },
  ],
  dividendAccruals: [
    { instrumentId: 'brick', pendingCents: dollars('0.10'), entitlementNumerator: 0n },
  ],
};

const snapshotOf = (state: GameState): GameSnapshot => ({
  state,
  pendingTaps: 0,
  pendingBoostedTaps: 0,
  unsavedElapsedMs: 0,
  unsavedBoostMs: 0,
  tapBoostAd: 'loading',
  notice: { kind: 'none' },
});

describe('portfolio', () => {
  it('values net worth as cash + business carrying value + property value + positions + pending dividends (UX02)', () => {
    expect(selectPortfolio(snapshotOf(holder), getContent()).worth).toEqual({
      cashCents: dollars('100'),
      businessesCents: dollars('300'),
      propertiesCents: dollars('20,000'),
      positionsCents: dollars('300'),
      pendingDividendsCents: dollars('0.10'),
      assetsCents: dollars('20,600.10'),
      netWorthCents: dollars('20,700.10'),
    });
  });

  it('shows income by source as net rates and lifetime earnings', () => {
    const earned = {
      ...holder,
      lifetimeTapEarningsCents: dollars('12'),
      income: { ...holder.income, businessEarningsCents: dollars('40') },
    };
    expect(selectPortfolio(snapshotOf(earned), getContent()).income).toEqual([
      { source: 'Taps', rate: undefined, lifetimeCents: dollars('12') },
      {
        source: 'Businesses',
        rate: { cents: dollars('10'), per: 'minute' },
        lifetimeCents: dollars('40'),
      },
      {
        source: 'Rent',
        rate: { cents: dollars('100'), per: 'minute' },
        lifetimeCents: dollars('0'),
      },
      {
        source: 'Dividends',
        rate: { cents: dollars('0.20'), per: 'hour' },
        lifetimeCents: dollars('0'),
      },
    ]);
  });

  it('lists holdings with business carrying value beside its lower sale quote', () => {
    const { holdings } = selectPortfolio(snapshotOf(holder), getContent());
    expect(holdings.businesses).toEqual([
      {
        id: 'vending',
        name: 'Vending Machine',
        valueCents: dollars('300'),
        saleCents: dollars('180'),
      },
    ]);
    expect(holdings.properties).toEqual([
      {
        id: 'studio',
        name: 'City Studio',
        valueCents: dollars('20,000'),
        saleCents: dollars('19,000'),
        rented: true,
      },
    ]);
    expect(holdings.positions).toEqual([
      expect.objectContaining({
        id: 'prism',
        name: 'Prism Labs',
        ticker: 'PRZM',
        quantity: units('10'),
        valueCents: dollars('300'),
        unrealizedCents: dollars('49.37'),
        realizedCents: dollars('7.78'),
      }),
    ]);
  });

  it('totals realized and unrealized market results', () => {
    expect(selectPortfolio(snapshotOf(holder), getContent()).results).toEqual({
      realizedCents: dollars('7.78'),
      unrealizedCents: dollars('49.37'),
    });
  });
});
