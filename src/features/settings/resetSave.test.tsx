import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGame, type TestGame } from '@/application/testGame';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openSettingsWithCash(): Promise<TestGame> {
  const session = await startTestGame();
  await session.game.dispatch({ id: 'batch-1', command: { type: 'TapBatch', taps: 5 } });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/settings' });
  return session;
}

const resetRow = () => screen.getByRole('button', { name: 'Reset save' });

describe('Reset Save', () => {
  it('asks for explicit confirmation before deleting anything', async () => {
    const session = await openSettingsWithCash();
    await fireEvent.press(resetRow());
    expect(screen.getByRole('header', { name: 'Reset your save?' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('5'));
  });

  it('starts a fresh save once confirmed', async () => {
    const session = await openSettingsWithCash();
    await fireEvent.press(resetRow());
    await fireEvent.press(screen.getByRole('button', { name: 'Delete everything' }));
    expect(screen.queryByRole('header', { name: 'Reset your save?' })).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('0'));
  });

  it('keeps the save and offers a retry when the reset cannot be saved', async () => {
    const session = await openSettingsWithCash();
    session.faults.failWrites = true;
    await fireEvent.press(resetRow());
    await fireEvent.press(screen.getByRole('button', { name: 'Delete everything' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be saved/);
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('5'));
  });
});
