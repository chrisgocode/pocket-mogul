import { CURRENT_ECONOMY_VERSION } from '@/content';
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
    ...freshGameState({
      saveId: 'goals-screen',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: 0,
    }),
    cashCents: dollars('250'),
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

describe('Goals', () => {
  it('lists all 17 goals and earns a badge when one is reached', async () => {
    await renderRouter('src/app', { initialUrl: '/goals' });
    expect(screen.getByText('0 of 17 badges')).toBeOnTheScreen();
    expect(screen.getAllByText('Pin to Earn')).toHaveLength(17);
    expect(screen.queryByText(/Home/)).toBeNull();
    expect(
      screen.getByLabelText('First business, not reached, Buy any business'),
    ).toBeOnTheScreen();
    await buyVending();
    expect(screen.getByText('1 of 17 badges')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('First business, badge earned, Reached Day 1, 00:00'),
    ).toBeOnTheScreen();
  });

  it('pins a goal to Earn with its progress', async () => {
    await renderRouter('src/app', { initialUrl: '/goals' });
    await fireEvent.press(screen.getByRole('button', { name: 'Pin Worth $10K' }));
    expect(screen.getByRole('button', { name: 'Unpin Worth $10K' })).toBeOnTheScreen();
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(
      screen.getByRole('button', {
        name: 'Pinned goal, Worth $10K, Peak net worth $250.00 of $10.00K',
      }),
    ).toBeOnTheScreen();
  });

  it('celebrates a reached goal without paying cash', async () => {
    await renderRouter('src/app', { initialUrl: '/home' });
    await buyVending();
    expect(
      screen.getByRole('button', { name: 'Goal reached: First business. Dismiss' }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Cash $0.00')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Goal reached/ }));
    expect(screen.queryByRole('button', { name: /^Goal reached/ })).toBeNull();
  });
});
