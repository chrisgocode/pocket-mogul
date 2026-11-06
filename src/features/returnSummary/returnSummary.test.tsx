import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { Game } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

const HOUR_MS = 3_600_000;

let mockGame: Promise<Game>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const withVending: GameState = {
  ...freshGameState({ saveId: 'owner', economyVersion: 1, wallMs: 1_800_000_000_000 }),
  businesses: [
    {
      definitionId: 'vending',
      levels: { capacity: 0, quality: 0, efficiency: 0 },
      managerOwned: false,
      capitalizedSpendCents: dollars('250'),
    },
  ],
};

async function returnAfter(awayMs: number): Promise<TestGame> {
  const left = await startTestGameFrom(withVending);
  const back = await left.restart({ awayMs });
  mockGame = Promise.resolve(back.game);
  return back;
}

describe('the return summary', () => {
  it('shows time away, credited time, earnings by source and the reached cap (UX05)', async () => {
    await returnAfter(10 * HOUR_MS);
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Time away, 10h')).toBeOnTheScreen();
    expect(screen.getByLabelText('Credited, 8h')).toBeOnTheScreen();
    expect(screen.getByLabelText('Businesses, $4,800.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total earned, $4,800.00')).toBeOnTheScreen();
    expect(screen.getByText('You reached the 8h offline cap.')).toBeOnTheScreen();
  });

  it('says the cap was not reached for a shorter absence', async () => {
    await returnAfter(2 * HOUR_MS + 15 * 60_000);
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(screen.getByLabelText('Time away, 2h 15m')).toBeOnTheScreen();
    expect(screen.getByLabelText('Businesses, $1,350.00')).toBeOnTheScreen();
    expect(screen.queryByText('You reached the 8h offline cap.')).not.toBeOnTheScreen();
  });

  it('Continue dismisses it without paying anything more (UX05)', async () => {
    const session = await returnAfter(10 * HOUR_MS);
    await renderRouter('src/app', { initialUrl: '/home' });
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('header', { name: 'Welcome back' })).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('4800'));
    expect(session.game.getSnapshot().state.returnSummary).toEqual({ status: 'none' });
  });
});
