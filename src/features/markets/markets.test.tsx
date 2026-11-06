import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Game } from '@/application/game';
import { startTestGame, type TestGame } from '@/application/testGame';

let mockGame: Promise<Game>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const MINUTE_MS = 60_000;

async function open(initialUrl: string, { playedMs = 0 } = {}): Promise<TestGame> {
  const session = await startTestGame();
  session.clock.advance(playedMs);
  await session.game.checkpoint();
  mockGame = Promise.resolve(session.game);
  await renderRouter('src/app', { initialUrl });
  return session;
}

const chartSummary = () => screen.getByRole('image', { name: /price chart/ });

describe('Markets', () => {
  it('lists all 24 stocks with their price change and the fictional notice', async () => {
    await open('/markets');
    expect(screen.getAllByRole('button', { name: /this market hour$/ })).toHaveLength(24);
    expect(
      screen.getByRole('button', { name: 'Prism Labs, PRZM, $25.00, unchanged this market hour' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('All companies and coins are fictional.')).toBeOnTheScreen();
  });

  it('lists the 6 coins on the Crypto segment', async () => {
    await open('/markets');
    await fireEvent.press(screen.getByRole('tab', { name: 'Crypto' }));
    expect(screen.getAllByRole('button', { name: /this market hour$/ })).toHaveLength(6);
  });

  it('explains market news with its duration', async () => {
    await open('/markets');
    expect(screen.getByRole('header', { name: 'Market news' })).toBeOnTheScreen();
    expect(screen.getByText('Live now · ends in 10 market minutes')).toBeOnTheScreen();
  });
});

describe('Asset details', () => {
  it('opens a stock from the list', async () => {
    await open('/markets');
    await fireEvent.press(screen.getByRole('button', { name: /^Prism Labs, PRZM/ }));
    expect(screen).toHavePathname('/markets/prism');
    expect(await screen.findByLabelText('Price, $25.00')).toBeOnTheScreen();
    expect(
      screen.getByText('Builds optics chips that split one signal into many.'),
    ).toBeOnTheScreen();
  });

  it('summarizes a new listing that has no history yet', async () => {
    await open('/markets/wag');
    expect(await screen.findByRole('image', { name: /price chart/ })).toHaveProp(
      'accessibilityLabel',
      'Wag Coin price chart. No market history yet. Price $0.10.',
    );
  });

  it('summarizes the past 60 market minutes, then the range a new save has', async () => {
    await open('/markets/prism', { playedMs: 61 * MINUTE_MS });
    expect(await screen.findByRole('image', { name: /price chart/ })).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(
        /^Prism Labs price chart\. Past 60 market minutes: \$[\d.,]+ to \$[\d.,]+, (?:(?:up|down) [\d.]+%|unchanged)\. High \$[\d.,]+, low \$[\d.,]+\.$/,
      ),
    );
    await fireEvent.press(screen.getByRole('tab', { name: '30 days' }));
    expect(chartSummary()).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining('Past 61 market minutes:'),
    );
  });
});
