import { CURRENT_ECONOMY_VERSION } from '@/content';
import { impactAsync } from 'expo-haptics';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const saved = {
  ...freshGameState({
    saveId: 'settings',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: 1_800_000_000_000,
  }),
  cashCents: dollars('1,234.56'),
};

let session: TestGame;

beforeEach(async () => {
  session = await startTestGameFrom(saved);
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  jest.mocked(impactAsync).mockClear();
});

async function settle(): Promise<void> {
  await act(async () => {
    await session.game.flushTaps();
  });
}

describe('Settings', () => {
  it('turns haptics off for tapping and keeps the choice after a restart', async () => {
    await renderRouter('src/app', { initialUrl: '/settings' });
    await fireEvent(screen.getByRole('switch', { name: 'Haptics' }), 'valueChange', false);
    await settle();
    expect(screen.getByRole('switch', { name: 'Haptics' })).toHaveProp('value', false);

    const restarted = await session.restart();
    expect(restarted.game.getSnapshot().state.settings.haptics).toBe('off');
  });

  it('stops tap haptics when haptics are off', async () => {
    await session.game.dispatch({
      id: 'haptics-off',
      command: { type: 'UpdateSettings', change: { haptics: 'off' } },
    });
    await renderRouter('src/app', { initialUrl: '/home' });
    await fireEvent.press(screen.getByRole('button', { name: /^Tap card/ }));
    expect(impactAsync).not.toHaveBeenCalled();
  });

  it('saves sound and reduced motion choices', async () => {
    await renderRouter('src/app', { initialUrl: '/settings' });
    await fireEvent(screen.getByRole('switch', { name: 'Sound' }), 'valueChange', false);
    await fireEvent.press(screen.getByRole('radio', { name: 'Reduced motion: On' }));
    await settle();
    expect(session.game.getSnapshot().state.settings).toMatchObject({
      sound: 'off',
      reducedMotion: 'on',
    });
    expect(screen.getByRole('radio', { name: 'Reduced motion: On' })).toBeSelected();
  });

  it('switches summaries between compact and full numbers', async () => {
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(screen.getByLabelText('Cash $1.23K')).toBeOnTheScreen();
    await act(async () => {
      await session.game.dispatch({
        id: 'full-numbers',
        command: { type: 'UpdateSettings', change: { numberFormatting: 'full' } },
      });
    });
    expect(screen.getByLabelText('Cash $1,234.56')).toBeOnTheScreen();
  });
});
