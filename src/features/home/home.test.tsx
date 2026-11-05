import { impactAsync } from 'expo-haptics';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AppState, type AppStateStatus } from 'react-native';

import type { Game } from '@/application/game';
import { nextPublish, startTestGame, type TestGame } from '@/application/testGame';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

let mockGame: Promise<Game>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

let session: TestGame;

beforeEach(async () => {
  session = await startTestGame();
  mockGame = Promise.resolve(session.game);
  jest.mocked(impactAsync).mockClear();
});

const tapCard = () => screen.getByRole('button', { name: /^Tap card/ });

const pressCard = (times: number) =>
  Array.from({ length: times }).reduce<Promise<void>>(
    (previous) => previous.then(() => fireEvent.press(tapCard())),
    Promise.resolve(),
  );

describe('Home tap card', () => {
  it('earns $1 per tap, shows it at once and commits it in one batch', async () => {
    await renderRouter('src/app', { initialUrl: '/home' });
    await pressCard(10);
    expect(screen.getByLabelText('Cash $10.00')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.revision).toBe(0);

    await act(async () => {
      session.clock.advance(250);
      await session.game.flushTaps();
    });
    expect(session.game.getSnapshot().state.cashCents).toBe(1000n);
    expect(session.game.getSnapshot().state.revision).toBe(1);
    expect(screen.getByLabelText('Cash $10.00')).toBeOnTheScreen();
  });

  it('does not auto-repeat while the card is held', async () => {
    await renderRouter('src/app', { initialUrl: '/home' });
    await fireEvent(tapCard(), 'pressIn');
    await fireEvent(tapCard(), 'longPress');
    expect(screen.getByLabelText('Cash $0.00')).toBeOnTheScreen();
    await fireEvent.press(tapCard());
    expect(screen.getByLabelText('Cash $1.00')).toBeOnTheScreen();
  });

  it('throttles haptics so rapid taps do not queue up', async () => {
    await renderRouter('src/app', { initialUrl: '/home' });
    await pressCard(3);
    expect(impactAsync).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(100));
    await fireEvent.press(tapCard());
    expect(impactAsync).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Cash $4.00')).toBeOnTheScreen();
  });

  it('saves unsaved taps as soon as the app leaves the foreground', async () => {
    const listeners: ((status: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener);
      return { remove: () => undefined };
    });
    await renderRouter('src/app', { initialUrl: '/home' });
    await pressCard(2);
    await act(async () => {
      const committed = nextPublish(session.game);
      for (const listener of listeners) listener('background');
      await committed;
    });
    expect(session.game.getSnapshot().state.cashCents).toBe(200n);
  });
});
