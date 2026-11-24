import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { selectBusinesses } from '@/application/businessesView';
import type { OpenedGame } from '@/application/game';
import { startTestGame, type TestGame } from '@/application/testGame';

jest.mock('@/application/businessesView', () => {
  const actual = jest.requireActual<{ selectBusinesses: typeof selectBusinesses }>(
    '@/application/businessesView',
  );
  return { ...actual, selectBusinesses: jest.fn(actual.selectBusinesses) };
});

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const SECOND_MS = 1_000;
const TAPS = 5;
const CASH_AFTER_TAPS = 'Cash $5.00';

let session: TestGame;

beforeEach(async () => {
  session = await startTestGame();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
});

async function tapAndWait() {
  await act(async () => {
    for (let tap = 0; tap < TAPS; tap += 1) session.game.tap();
    await session.game.flushTaps();
  });
  await act(async () => {
    session.clock.advance(SECOND_MS);
    await session.game.flushTaps();
  });
}

describe('hidden tabs', () => {
  it('stop rendering while another tab is open, then catch up on return', async () => {
    await renderRouter('src/app', { initialUrl: '/businesses' });
    await fireEvent.press(screen.getByRole('button', { name: /^Earn/ }));
    jest.mocked(selectBusinesses).mockClear();

    await tapAndWait();
    expect(selectBusinesses).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: /^Businesses/ }));
    expect(selectBusinesses).toHaveBeenCalled();
    expect(screen.getByLabelText(CASH_AFTER_TAPS)).toBeOnTheScreen();
  });
});
