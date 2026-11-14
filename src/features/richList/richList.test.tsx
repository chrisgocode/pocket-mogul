import { CURRENT_ECONOMY_VERSION } from '@/content';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

let session: TestGame;

const FRESH = freshGameState({
  saveId: 'rich-list-screen',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

const UNRANKED: GameState['richList'] = {
  status: 'active',
  day: 0,
  fortunes: {},
  passed: 0,
  mostPassed: 0,
  news: { status: 'none' },
};

const RANKED: Pick<GameState, 'richList' | 'cashCents' | 'peakNetWorthCents'> = {
  cashCents: dollars('6,000'),
  peakNetWorthCents: dollars('6,000'),
  richList: { ...UNRANKED, passed: 2, mostPassed: 2 },
};

const start = async (initialUrl: string, overrides: Partial<GameState> = {}) => {
  session = await startTestGameFrom({ ...FRESH, ...overrides });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
};

const PASSED = 'Passed Francoise Bettencurl on the Rich List · now #19';

describe('Rich List (UX03d)', () => {
  it('shows the place on Profile and opens the list from there', async () => {
    await start('/portfolio', RANKED);
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Rich List, number 19 of 21, $6.00K behind Chainpeng Zap, open the Rich List',
      }),
    );
    expect(await screen.findByText('#19 of 21')).toBeOnTheScreen();
    expect(screen.getByText('$6.00K behind Chainpeng Zap')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Number 1, Elon Tusk, Rockets and electric cars, $5.00B'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Number 19, You, Peak net worth, $6.00K')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Number 21, Thomas Peterfee, Discount brokerage, $2.00K'),
    ).toBeOnTheScreen();
  });

  it('is not on Profile before the player has started', async () => {
    await start('/portfolio');
    expect(screen.queryByText('Rich List')).toBeNull();
  });

  it('announces passing a mogul and clears when tapped', async () => {
    await start('/home', { ...RANKED, richList: UNRANKED });
    expect(screen.queryByText(PASSED)).toBeNull();
    await act(() => session.game.checkpoint());
    expect(await screen.findByText(PASSED)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: `${PASSED}. Dismiss` }));
    expect(screen.queryByText(PASSED)).toBeNull();
  });
});
