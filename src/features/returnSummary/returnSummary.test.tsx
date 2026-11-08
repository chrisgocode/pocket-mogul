import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { CURRENT_ECONOMY_VERSION, getContent, type Content } from '@/content';
import {
  startTestGameFrom,
  withBusinessCosts,
  withoutIncidents,
  type TestGame,
} from '@/application/testGame';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

const HOUR_MS = 3_600_000;
const DAY_MS = 600_000;
const SAFE_DAYS = 30;

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const withVending: GameState = {
  ...freshGameState({
    saveId: 'owner',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: 1_800_000_000_000,
  }),
  businesses: [ownedBusiness('vending')],
};

async function returnAfter(
  awayMs: number,
  left: { state: GameState; content?: Content } = { state: withVending },
): Promise<TestGame> {
  const content = left.content ?? withoutIncidents(getContent());
  const session = await startTestGameFrom(left.state, { content });
  const back = await session.restart({ awayMs });
  mockGame = Promise.resolve({ status: 'ready', game: back.game });
  return back;
}

describe('the return summary', () => {
  it('shows time away, credited time, earnings by source and the reached cap (UX05)', async () => {
    await returnAfter(10 * HOUR_MS);
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Time away, 10h')).toBeOnTheScreen();
    expect(screen.getByLabelText('Credited, 8h')).toBeOnTheScreen();
    expect(screen.getByLabelText('Businesses, $2,400.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total earned, $2,400.00')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Rent/)).not.toBeOnTheScreen();
    expect(screen.getByText('You reached the 8h offline cap.')).toBeOnTheScreen();
  });

  it('says the cap was not reached for a shorter absence', async () => {
    await returnAfter(2 * HOUR_MS + 15 * 60_000);
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(screen.getByLabelText('Time away, 2h 15m')).toBeOnTheScreen();
    expect(screen.getByLabelText('Businesses, $675.00')).toBeOnTheScreen();
    expect(screen.queryByText('You reached the 8h offline cap.')).not.toBeOnTheScreen();
  });

  it('Continue dismisses it without paying anything more (UX05)', async () => {
    const session = await returnAfter(10 * HOUR_MS);
    await renderRouter('src/app', { initialUrl: '/home' });
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('header', { name: 'Welcome back' })).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('2400'));
    expect(session.game.getSnapshot().state.returnSummary).toEqual({ status: 'none' });
  });

  it('names a business that closed while the player was away (BUS12)', async () => {
    const losing = withBusinessCosts(getContent(), {
      businessId: 'vending',
      costsPerDay: dollars('340'),
    });
    const state = {
      ...withVending,
      businesses: [ownedBusiness('vending', { treasuryCents: dollars('10') })],
    };
    await returnAfter(HOUR_MS, { state, content: losing });
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(
      screen.getByText('Vending Machine closed: its treasury ran out. Deposit cash to reopen it.'),
    ).toBeOnTheScreen();
  });

  it('lists incidents from the absence (BUS16, UX05)', async () => {
    const state = {
      ...withVending,
      clock: { ...withVending.clock, simulationMs: SAFE_DAYS * DAY_MS },
      saveId: 'risky',
      market: { ...withVending.market, seed: 'risky' },
      businesses: [ownedBusiness('vending', { treasuryCents: dollars('500') })],
    };
    await returnAfter(8 * HOUR_MS, { state, content: getContent() });
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(
      screen.getByText('Vending Machine: Breakdown. Capacity down 30% for 4 days.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Vending Machine: Vandalism. Cost $280.00 from its treasury.'),
    ).toBeOnTheScreen();
  });
});
