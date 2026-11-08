import { getContent } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, dollarPrice, units } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { selectPortfolio } from './portfolioView';
import { selectStockQuotes } from './marketsView';
import { startTestGameFrom } from './testGame';

const listed: GameState = {
  ...freshGameState({ saveId: 'valuation', economyVersion: 1, wallMs: 1_800_000_000_000 }),
  cashCents: dollars('1000000'),
  tradingUnlocked: true,
  market: {
    seed: 'valuation',
    tick: 0,
    quotes: { 'listing:coffee_kiosk': dollarPrice('2') },
    candles: {},
  },
  businesses: [
    ownedBusiness('coffee_kiosk', {
      stage: 4,
      treasuryCents: dollars('1000'),
      listing: {
        status: 'listed',
        ticker: 'BEAN',
        sharesHeld: units('800000'),
      },
    }),
  ],
  positions: [
    {
      instrumentId: 'listing:coffee_kiosk',
      quantity: units('800000'),
      remainingBasisCents: dollars('200'),
      realizedProfitCents: dollars('0'),
    },
  ],
};

describe('listed valuation', () => {
  it('marks the retained position once and shows it in Markets and Wealth', async () => {
    const session = await startTestGameFrom(listed);
    const snapshot = session.game.getSnapshot();
    const portfolio = selectPortfolio(snapshot, getContent());
    expect(portfolio.worth.netWorthCents).toBe(dollars('2600000'));
    expect(portfolio.worth.businessesCents).toBe(0n);
    expect(portfolio.holdings.positions[0]).toMatchObject({
      ticker: 'BEAN',
      valueCents: dollars('1600000'),
    });
    expect(
      selectStockQuotes(snapshot, getContent()).find((quote) => quote.asset.ticker === 'BEAN')
        ?.price,
    ).toBe(dollarPrice('2'));
  });

  it('sells the retained stake at market price plus its share of treasury', async () => {
    const session = await startTestGameFrom(listed);
    expect(
      await session.game.dispatch({
        id: 'sell',
        command: {
          type: 'SellBusiness',
          businessId: 'coffee_kiosk',
        },
      }),
    ).toMatchObject({ ok: true, cashChangeCents: dollars('1600800') });
    expect(session.game.getSnapshot().state.businesses).toEqual([]);
    expect(session.game.getSnapshot().state.positions).toEqual([]);
  });

  it('charges the stock fee on a partial buyback and raises the retained stake', async () => {
    const session = await startTestGameFrom(listed);
    const outcome = await session.game.dispatch({
      id: 'buy',
      command: {
        type: 'ExecuteTrade',
        assetId: 'listing:coffee_kiosk',
        side: 'buy',
        quantity: units('100000'),
        quotedTick: 0,
      },
    });
    expect(outcome).toMatchObject({ ok: true, cashChangeCents: dollars('-200500') });
    expect(session.game.getSnapshot().state.businesses[0]?.listing).toMatchObject({
      sharesHeld: units('900000'),
    });
  });
});

describe('ordinary market positions', () => {
  it('keeps a fictional stock when the position reaches one million shares', async () => {
    const session = await startTestGameFrom({
      ...listed,
      businesses: [],
      market: { ...listed.market, quotes: { wag: dollarPrice('1') } },
      positions: [
        {
          instrumentId: 'wag',
          quantity: units('999999'),
          remainingBasisCents: dollars('999999'),
          realizedProfitCents: dollars('0'),
        },
      ],
    });
    expect(
      await session.game.dispatch({
        id: 'buy-wag',
        command: {
          type: 'ExecuteTrade',
          assetId: 'wag',
          side: 'buy',
          quantity: units('1'),
          quotedTick: 0,
        },
      }),
    ).toMatchObject({ ok: true });
    expect(session.game.getSnapshot().state.positions[0]?.quantity).toBe(units('1000000'));
  });
});
