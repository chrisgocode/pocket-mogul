import { CURRENT_ECONOMY_VERSION } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars, units } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { startTestGameFrom } from './testGame';

const regional = {
  ...freshGameState({
    saveId: 'listing',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: 1_800_000_000_000,
  }),
  cashCents: dollars('1000000'),
  tradingUnlocked: true,
  businesses: [ownedBusiness('coffee_kiosk', { stage: 4, payoutPercent: 100 })],
};

describe('going public (BUS19)', () => {
  it('floats once into the treasury and keeps the retained shares across restart', async () => {
    const session = await startTestGameFrom(regional);
    const envelope = {
      id: 'ipo',
      command: {
        type: 'GoPublic',
        businessId: 'coffee_kiosk',
        floatPercent: 20,
        ticker: 'BEAN',
      },
    } as const;
    expect(await session.game.dispatch(envelope)).toMatchObject({ ok: true, cashChangeCents: 0n });
    expect(await session.game.dispatch(envelope)).toMatchObject({ ok: true });
    const restarted = await session.restart();
    expect(restarted.game.getSnapshot().state.businesses[0]?.listing).toMatchObject({
      status: 'listed',
      ticker: 'BEAN',
      sharesHeld: units('800000'),
    });
    expect(restarted.game.getSnapshot().state.positions).toContainEqual(
      expect.objectContaining({
        instrumentId: 'listing:coffee_kiosk',
        quantity: units('800000'),
      }),
    );
    expect(restarted.game.getSnapshot().state.businesses[0]?.treasuryCents).toBeGreaterThan(0n);
  });
});

describe('listed share ownership', () => {
  it('pays only the retained stake and buys back all outside shares to delist', async () => {
    const session = await startTestGameFrom(regional);
    await session.game.dispatch({
      id: 'ipo',
      command: {
        type: 'GoPublic',
        businessId: 'coffee_kiosk',
        floatPercent: 20,
        ticker: 'BEAN',
      },
    });
    const before = session.game.getSnapshot().state;
    session.clock.advance(600_000);
    await session.game.dispatch({ id: 'day', command: { type: 'AdvanceTime' } });
    const after = session.game.getSnapshot().state;
    expect(after.cashCents - before.cashCents).toBe(128000n);
    expect(after.shareholderPayouts).toEqual([{ businessId: 'coffee_kiosk', paidCents: 32000n }]);
    expect(
      await session.game.dispatch({
        id: 'buyback',
        command: {
          type: 'ExecuteTrade',
          assetId: 'listing:coffee_kiosk',
          side: 'buy',
          quantity: units('200000'),
          quotedTick: after.market.tick,
        },
      }),
    ).toMatchObject({ ok: true });
    expect(session.game.getSnapshot().state.businesses[0]?.listing).toEqual({ status: 'private' });
    expect(session.game.getSnapshot().state.positions).toEqual([]);
  });
});

describe('listing validation and market trades', () => {
  it.each([0, 15, 50])('rejects an unsupported float of %i percent', async (floatPercent) => {
    const session = await startTestGameFrom(regional);
    expect(
      await session.game.dispatch({
        id: 'ipo',
        command: {
          type: 'GoPublic',
          businessId: 'coffee_kiosk',
          floatPercent,
          ticker: 'BEAN',
        },
      }),
    ).toEqual({ ok: false, error: 'INVALID_QUANTITY' });
  });

  it.each(['AB', 'ABCDEF', 'bean', 'A1B'])('rejects ticker %s', async (ticker) => {
    const session = await startTestGameFrom(regional);
    expect(
      await session.game.dispatch({
        id: 'ipo',
        command: {
          type: 'GoPublic',
          businessId: 'coffee_kiosk',
          floatPercent: 20,
          ticker,
        },
      }),
    ).toEqual({ ok: false, error: 'INVALID_QUANTITY' });
  });

  it('locks listing before stage 4', async () => {
    const session = await startTestGameFrom({
      ...regional,
      businesses: [ownedBusiness('coffee_kiosk', { stage: 3 })],
    });
    expect(
      await session.game.dispatch({
        id: 'ipo',
        command: {
          type: 'GoPublic',
          businessId: 'coffee_kiosk',
          floatPercent: 20,
          ticker: 'BEAN',
        },
      }),
    ).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });
});

describe('listed order checks', () => {
  it('refuses buying more than the outside float and stale quotes', async () => {
    const session = await startTestGameFrom(regional);
    await session.game.dispatch({
      id: 'ipo',
      command: {
        type: 'GoPublic',
        businessId: 'coffee_kiosk',
        floatPercent: 20,
        ticker: 'BEAN',
      },
    });
    expect(
      await session.game.dispatch({
        id: 'overbuy',
        command: {
          type: 'ExecuteTrade',
          assetId: 'listing:coffee_kiosk',
          side: 'buy',
          quantity: units('200001'),
          quotedTick: 0,
        },
      }),
    ).toEqual({ ok: false, error: 'INSUFFICIENT_HOLDING' });
    session.clock.advance(60_000);
    expect(
      await session.game.dispatch({
        id: 'stale',
        command: {
          type: 'ExecuteTrade',
          assetId: 'listing:coffee_kiosk',
          side: 'buy',
          quantity: units('1'),
          quotedTick: 0,
        },
      }),
    ).toEqual({ ok: false, error: 'STALE_QUOTE' });
  });
});

describe('listing reader safety', () => {
  it('keeps the additive schema version and requires the listing-aware reader', async () => {
    const session = await startTestGameFrom(regional);
    await session.game.dispatch({
      id: 'ipo',
      command: {
        type: 'GoPublic',
        businessId: 'coffee_kiosk',
        floatPercent: 20,
        ticker: 'BEAN',
      },
    });
    expect(session.game.getSnapshot().state).toMatchObject({
      schemaVersion: 2,
      minReaderVersion: 4,
    });
    expect((await session.restart()).game.getSnapshot().state.minReaderVersion).toBe(4);
  });
});
