import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const MINUTE_MS = 60_000;

async function open(initialUrl: string, overrides: Partial<GameState> = {}): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'trader', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    cashCents: dollars('1,000'),
    tradingUnlocked: true,
    ...overrides,
  });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

async function enterShares(count: string): Promise<void> {
  await fireEvent.press(await screen.findByRole('button', { name: 'Buy Prism Labs' }));
  await fireEvent.changeText(screen.getByLabelText('Shares to buy'), count);
}

describe('Stock trading', () => {
  it('explains that trading opens after the first business', async () => {
    await open('/markets/prism', { tradingUnlocked: false });
    expect(
      await screen.findByText('Trading opens after you buy your first business.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Buy Prism Labs' })).toBeDisabled();
  });

  it('quotes notional, fee, cash change and time, then buys into a position', async () => {
    await open('/markets/prism');
    await enterShares('4');
    expect(screen.getByLabelText('Notional, $100.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Trading fee, $0.25')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cash change, -$100.25')).toBeOnTheScreen();
    expect(screen.getByLabelText('Quote time, Day 1, 00:00 market time')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm buy · -$100.25' }));
    expect(await screen.findByLabelText('Shares, 4')).toBeOnTheScreen();
    expect(screen.getByLabelText('Current value, $100.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Unrealized result, -$0.25')).toBeOnTheScreen();
  });

  it('buys the most the cash allows with Max, fee included', async () => {
    await open('/markets/prism');
    await enterShares('');
    await fireEvent.press(screen.getByRole('button', { name: 'Max of your cash' }));
    expect(screen.getByLabelText('Shares to buy')).toHaveDisplayValue('39.9');
    expect(screen.getByLabelText('Cash change, -$1,000.00')).toBeOnTheScreen();
  });

  it('keeps the entered quantity and asks for review when the quote crosses a tick', async () => {
    const session = await open('/markets/prism');
    await enterShares('4');
    session.clock.advance(MINUTE_MS);
    await session.game.checkpoint();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The price moved at Day 1, 00:01 market time. Review the new amount before you confirm.',
    );
    expect(screen.getByLabelText('Shares to buy')).toHaveDisplayValue('4');
    expect(screen.queryByRole('button', { name: /^Confirm buy/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Review new price' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Quote time, Day 1, 00:01 market time')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm buy/ }));
    expect(await screen.findByLabelText('Shares, 4')).toBeOnTheScreen();
  });

  it('keeps the shares a dollar amount converted to when the quote goes stale', async () => {
    const session = await open('/markets/prism');
    await fireEvent.press(await screen.findByRole('button', { name: 'Buy Prism Labs' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Dollars' }));
    await fireEvent.changeText(screen.getByLabelText('Dollars to spend, fee included'), '100.25');
    expect(screen.getByLabelText('Quantity, 4 shares')).toBeOnTheScreen();
    session.clock.advance(MINUTE_MS);
    await session.game.checkpoint();
    await fireEvent.press(await screen.findByRole('button', { name: 'Review new price' }));
    expect(screen.getByLabelText('Quantity, 4 shares')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dollars to spend, fee included')).toHaveDisplayValue('100.25');
  });

  it('refuses a buy under the $1 minimum before it is sent', async () => {
    await open('/markets/prism');
    await enterShares('0.01');
    expect(
      screen.getByText('Trades start at $1.00. Selling your whole position is always allowed.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Review buy' })).toBeDisabled();
  });
});

describe('Crypto trading', () => {
  it('quotes coins with the 50 bps crypto fee, then buys into a position', async () => {
    await open('/markets/wag');
    await fireEvent.press(await screen.findByRole('button', { name: 'Buy Wag Coin' }));
    await fireEvent.changeText(screen.getByLabelText('Coins to buy'), '1000');
    expect(screen.getByLabelText('Quantity, 1,000 coins')).toBeOnTheScreen();
    expect(screen.getByLabelText('Notional, $100.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Trading fee, $0.50')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm buy · -$100.50' }));
    expect(await screen.findByLabelText('Coins, 1,000')).toBeOnTheScreen();
    expect(screen.getByLabelText('Unrealized result, -$0.50')).toBeOnTheScreen();
  });
});

describe('Watchlist', () => {
  it('toggles from the stock details and saves the choice', async () => {
    const session = await open('/markets/prism');
    await fireEvent.press(await screen.findByRole('button', { name: 'Add to watchlist' }));
    expect(await screen.findByRole('button', { name: 'Remove from watchlist' })).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.watchlist).toEqual(['prism']);
  });

  it('lists watched stocks at the top of Markets', async () => {
    await open('/markets', { watchlist: ['prism'] });
    expect(await screen.findByRole('header', { name: 'Watchlist' })).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^Prism Labs, PRZM/ })).toHaveLength(2);
  });
});
