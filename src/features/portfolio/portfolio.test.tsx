import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

let session: TestGame;

beforeEach(async () => {
  session = await startTestGameFrom({
    ...freshGameState({ saveId: 'portfolio-screen', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars('1,000'),
  });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
});

const buyVending = () =>
  act(async () => {
    await session.game.dispatch({
      id: 'buy-vending',
      command: { type: 'BuyBusiness', businessId: 'vending' },
    });
  });

describe('Portfolio', () => {
  it('shows cash, owned assets and net worth separately, with the valuation explained', async () => {
    await buyVending();
    await renderRouter('src/app', { initialUrl: '/portfolio' });
    expect(screen.getByLabelText('Net worth, $1,000.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cash, $750.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Owned assets, $250.00')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Vending Machine, Business, $250.00, Sells for $150.00'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'How net worth is valued' }));
    expect(screen.getByLabelText('Businesses, $250.00')).toBeOnTheScreen();
    expect(screen.getByText(/Selling pays 60% of that/)).toBeOnTheScreen();
  });

  it('shows income by source with net rates', async () => {
    await buyVending();
    await renderRouter('src/app', { initialUrl: '/portfolio' });
    expect(screen.getByLabelText('Businesses, $5.00/min net, $0.00, earned')).toBeOnTheScreen();
  });

  it('lists recent activity and opens the full history with lifetime totals', async () => {
    await renderRouter('src/app', { initialUrl: '/portfolio' });
    await buyVending();
    expect(
      await screen.findByLabelText('Bought Vending Machine, Day 1, 00:00, -$250.00'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'See all activity' }));
    expect(screen).toHavePathname('/portfolio/activity');
    expect(screen.getByLabelText('Entries recorded, 1')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Bought Vending Machine, Day 1, 00:00, -$250.00'),
    ).toBeOnTheScreen();
  });
});
