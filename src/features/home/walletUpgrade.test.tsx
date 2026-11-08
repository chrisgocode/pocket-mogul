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

async function openHome(taps: number): Promise<TestGame> {
  const session = await startTestGame();
  await session.game.dispatch({ id: 'savings', command: { type: 'TapBatch', taps } });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/home' });
  return session;
}

const upgradeControl = () => screen.getByRole('button', { name: /^Upgrade wallet/ });
const confirmButton = () => screen.getByRole('button', { name: /^Confirm upgrade|^Try again/ });

describe('Home wallet upgrade', () => {
  it('shows current and next earnings, price and what is still missing', async () => {
    await openHome(40);
    expect(screen.getByText('$1.00 → $1.50 per tap')).toBeOnTheScreen();
    expect(screen.getByText('Need $60.00 more')).toBeOnTheScreen();
    expect(upgradeControl()).toBeDisabled();
  });

  it('confirms the cash change and effect, then updates all four together (AC03)', async () => {
    await openHome(130);
    await fireEvent.press(upgradeControl());
    expect(screen.getByText('-$100.00')).toBeOnTheScreen();
    expect(screen.getByText('$1.00 → $1.50')).toBeOnTheScreen();
    await fireEvent.press(confirmButton());
    expect(await screen.findByLabelText('Cash $30.00')).toBeOnTheScreen();
    expect(screen.getByText('$1.50 → $2.00 per tap')).toBeOnTheScreen();
    expect(screen.getByText('Need $115.00 more')).toBeOnTheScreen();
    expect(screen.queryByText('-$100.00')).not.toBeOnTheScreen();
  });

  it('cannot be submitted twice while the upgrade is saving', async () => {
    const session = await openHome(300);
    await fireEvent.press(upgradeControl());
    const release = session.holdSaves();
    await fireEvent.press(confirmButton());
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Saving…' }));
    await act(async () => {
      release();
      await session.game.flushTaps();
    });
    expect(await screen.findByLabelText('Cash $200.00')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.tap.walletLevel).toBe(1);
  });

  it('rolls back unsaved taps on a failed save and lets the player retry', async () => {
    const session = await openHome(100);
    await fireEvent.press(screen.getByRole('button', { name: /^Tap card/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Tap card/ }));
    expect(screen.getByLabelText('Cash $102.00')).toBeOnTheScreen();
    session.faults.failWrites = true;
    await fireEvent.press(upgradeControl());
    await fireEvent.press(confirmButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be saved/);
    expect(screen.getByLabelText('Cash $100.00')).toBeOnTheScreen();

    session.faults.failWrites = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Cash $0.00')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.tap.walletLevel).toBe(1);
  });

  it('shows Max level and the final card art at level 100', async () => {
    const fresh = freshGameState({
      saveId: 'maxed',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: 0,
    });
    const session = await startTestGameFrom({
      ...fresh,
      cashCents: dollars('5'),
      tap: { ...fresh.tap, walletLevel: 100 },
    });
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(screen.getByText('Max level')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Tap card, Obsidian card/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Upgrade wallet/ })).not.toBeOnTheScreen();
  });
});
