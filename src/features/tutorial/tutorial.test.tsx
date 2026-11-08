import { CURRENT_ECONOMY_VERSION } from '@/content';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGame, startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function open(session: TestGame, initialUrl: string): Promise<void> {
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
}

const hint = () => screen.getByRole('summary', { name: /^Tutorial/ });

describe('the tutorial on Home', () => {
  it('asks for a tap first, then the wallet upgrade once the tap is saved', async () => {
    const session = await startTestGame();
    await open(session, '/home');
    expect(hint()).toHaveAccessibleName(/step 1 of 3, Tap your wallet/);
    await fireEvent.press(screen.getByRole('button', { name: /^Tap card/ }));
    await act(async () => {
      session.clock.advance(250);
      await session.game.flushTaps();
    });
    expect(hint()).toHaveAccessibleName(/step 2 of 3, Upgrade your wallet/);
  });

  it('can be skipped for good', async () => {
    const session = await startTestGame();
    await open(session, '/home');
    await fireEvent.press(screen.getByRole('button', { name: 'Skip tutorial' }));
    await act(() => session.game.flushTaps());
    expect(screen.queryByRole('summary', { name: /^Tutorial/ })).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.tutorial.explanations).toBe('skipped');
  });
});

describe('the tutorial on Businesses', () => {
  it('points at the first business once the wallet is upgraded', async () => {
    const saved = freshGameState({
      saveId: 'step-3',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: 1_800_000_000_000,
    });
    const session = await startTestGameFrom({
      ...saved,
      cashCents: dollars('300'),
      tap: { walletLevel: 1, totalAcceptedTaps: 120 },
      tutorial: { completedSteps: ['tap', 'upgradeWallet'], explanations: 'shown' },
    });
    await open(session, '/businesses');
    expect(hint()).toHaveAccessibleName(/step 3 of 3, Buy your first business/);
    await fireEvent.press(screen.getByRole('button', { name: /^Buy Vending Machine/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(screen.queryByRole('summary', { name: /^Tutorial/ })).not.toBeOnTheScreen();
  });

  it('stays out of the way before the business step', async () => {
    const session = await startTestGame();
    await open(session, '/businesses');
    expect(screen.queryByRole('summary', { name: /^Tutorial/ })).not.toBeOnTheScreen();
  });
});
