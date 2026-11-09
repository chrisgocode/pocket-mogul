import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGame, startTestGameFrom } from '@/application/testGame';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const BACKUP_DUE_MS = 60_000;

async function launchAfterCorruption(): Promise<void> {
  const first = await startTestGame();
  await first.game.dispatch({ id: 'batch-1', command: { type: 'TapBatch', taps: 3 } });
  first.clock.advance(BACKUP_DUE_MS);
  await first.game.checkpoint();
  first.replaceSaveDocument('not json');
  mockGame = first.reopen();
  await renderRouter('src/app', { initialUrl: '/home' });
}

describe('opening a damaged save', () => {
  it('tells the player their save was restored from a backup (AC23)', async () => {
    await launchAfterCorruption();
    expect(screen.getByRole('header', { name: 'Save restored' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Cash $3.00')).toBeOnTheScreen();
  });

  it('dismisses the notice with OK', async () => {
    await launchAfterCorruption();
    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('header', { name: 'Save restored' })).not.toBeOnTheScreen();
  });

  it('stops on a damaged save with no valid backup instead of starting over', async () => {
    const first = await startTestGame();
    first.replaceSaveDocument('not json');
    first.corruptBackups();
    mockGame = first.reopen();
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(screen.getByRole('header', { name: "Your save couldn't be opened" })).toBeOnTheScreen();
    expect(screen.getByText('Nothing in your save has been changed.')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Cash/)).not.toBeOnTheScreen();
  });
});

describe('opening a save from a newer version', () => {
  it('asks the player to update and leaves the save alone (AC23)', async () => {
    const first = await startTestGame();
    const newer = JSON.stringify({ ...JSON.parse(first.saveDocument()), minReaderVersion: 99 });
    first.replaceSaveDocument(newer);
    mockGame = first.reopen();
    await renderRouter('src/app', { initialUrl: '/home' });
    expect(
      screen.getByRole('header', { name: 'Update Pocket Fortune to keep playing' }),
    ).toBeOnTheScreen();
    expect(first.saveDocument()).toBe(newer);
  });
});

describe('a purchase that cannot be saved', () => {
  it('shows SAVE_FAILED as recoverable and succeeds on retry (AC27)', async () => {
    const session = await startTestGameFrom({
      ...freshGameState({ saveId: 'buyer', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
      cashCents: dollars('300'),
    });
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/businesses' });
    session.faults.failWritesMatching = /command_receipts/;
    await fireEvent.press(screen.getByRole('button', { name: /^Buy Vending Machine/ }));
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm purchase/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be saved/);
    expect(screen.getByLabelText('Cash $300.00')).toBeOnTheScreen();

    session.faults.failWritesMatching = undefined;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Cash $50.00')).toBeOnTheScreen();
  });
});
