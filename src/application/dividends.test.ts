import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, units, type QuantityMicrounits } from '@/domain/money';
import type { TradeSide } from '@/domain/tradeQuotes';

import type { Game } from './game';
import { encodeSave } from './saveFormat';
import { currentState, migratedState, startTestGameFrom, type TestGame } from './testGame';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const trade = (game: Game, order: { side: TradeSide; quantity: QuantityMicrounits }) =>
  game.dispatch({
    id: game.createCommandId(),
    command: {
      type: 'ExecuteTrade',
      assetId: 'prism',
      side: order.side,
      quantity: order.quantity,
      quotedTick: game.getSnapshot().state.market.tick,
    },
  });

function startWith(overrides: Partial<GameState> = {}): Promise<TestGame> {
  return startTestGameFrom({
    ...freshGameState({ saveId: 'holder', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars('1,000'),
    tradingUnlocked: true,
    ...overrides,
  });
}

async function wait(session: TestGame, ms: number): Promise<void> {
  session.clock.advance(ms);
  await session.game.checkpoint();
}

const stateOf = (session: TestGame) => session.game.getSnapshot().state;
const dividendsPaid = (session: TestGame) => stateOf(session).income.dividendEarningsCents;

const heldPrism = {
  instrumentId: 'prism',
  quantity: units('10'),
  remainingBasisCents: dollars('250'),
  realizedProfitCents: dollars('0'),
};

describe('stock dividends in play', () => {
  it('pays $0.02 a share into cash at the simulation hour', async () => {
    const session = await startWith({ positions: [heldPrism] });
    await wait(session, HOUR_MS);
    expect<bigint>(dividendsPaid(session)).toBe(dollars('0.20'));
    expect<bigint>(stateOf(session).cashCents).toBe(dollars('1,000.20'));
  });

  it('keeps entitlement earned before selling every share (AC18)', async () => {
    const session = await startWith({ positions: [heldPrism] });
    await wait(session, 30 * MINUTE_MS);
    await trade(session.game, { side: 'sell', quantity: units('10') });
    expect(stateOf(session).dividendAccruals).toEqual([
      { instrumentId: 'prism', pendingCents: dollars('0.10'), entitlementNumerator: 0n },
    ]);
    await wait(session, 30 * MINUTE_MS);
    expect<bigint>(dividendsPaid(session)).toBe(dollars('0.10'));
  });

  it('pays newly bought shares only for the time they were held (AC18)', async () => {
    const session = await startWith({ positions: [heldPrism] });
    await wait(session, 30 * MINUTE_MS);
    await trade(session.game, { side: 'buy', quantity: units('10') });
    await wait(session, 30 * MINUTE_MS);
    expect<bigint>(dividendsPaid(session)).toBe(dollars('0.30'));
  });

  it('counts pending dividends in net worth (UX02)', async () => {
    const session = await startWith({
      cashCents: dollars('0'),
      dividendAccruals: [
        { instrumentId: 'prism', pendingCents: dollars('0.10'), entitlementNumerator: 0n },
      ],
    });
    await session.game.checkpoint();
    expect<bigint>(stateOf(session).peakNetWorthCents).toBe(dollars('0.10'));
  });

  it('keeps pending entitlement across a restart', async () => {
    const session = await startWith({ positions: [heldPrism] });
    await wait(session, 30 * MINUTE_MS);
    const restarted = await session.restart();
    expect(currentState(restarted.saveDocument()).dividendAccruals).toEqual([
      { instrumentId: 'prism', pendingCents: dollars('0.10'), entitlementNumerator: 0n },
    ]);
  });

  it('pays dividends for the credited part of an absence and reports them', async () => {
    const session = await startWith({ positions: [heldPrism] });
    const { game } = await session.restart({ awayMs: 10 * HOUR_MS });
    const { income, returnSummary } = game.getSnapshot().state;
    expect<bigint>(income.dividendEarningsCents).toBe(dollars('1.60'));
    expect(returnSummary).toEqual({
      status: 'pending',
      summary: {
        awayMs: 10 * HOUR_MS,
        creditedMs: 8 * HOUR_MS,
        earnings: { businesses: dollars('0'), rent: dollars('0'), dividends: dollars('1.60') },
      },
    });
  });
});

function schemaV3Save(): string {
  const fresh = freshGameState({ saveId: 'older', economyVersion: 1, wallMs: 0 });
  const { dividendAccruals: _accruals, income, ...rest } = fresh;
  const { dividendEarningsCents: _earned, ...olderIncome } = income;
  const summary = {
    awayMs: HOUR_MS,
    creditedMs: HOUR_MS,
    earnings: { businesses: 600n, rent: 0n },
  };
  return encodeSave({
    ...rest,
    schemaVersion: 3,
    income: olderIncome,
    returnSummary: { status: 'pending', summary },
  } as unknown as GameState);
}

describe('saves from before dividends', () => {
  it('migrate from schema 3 with no accrued or earned dividends', () => {
    const state = migratedState(schemaV3Save());
    expect(state.schemaVersion).toBe(5);
    expect(state.dividendAccruals).toEqual([]);
    expect<bigint>(state.income.dividendEarningsCents).toBe(dollars('0'));
    expect(state.returnSummary).toEqual({
      status: 'pending',
      summary: {
        awayMs: HOUR_MS,
        creditedMs: HOUR_MS,
        earnings: { businesses: dollars('6'), rent: dollars('0'), dividends: dollars('0') },
      },
    });
  });
});
