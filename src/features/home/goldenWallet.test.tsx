import { CURRENT_ECONOMY_VERSION } from '@/content';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom } from '@/application/testGame';
import { freshGameState } from '@/domain/gameState';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const golden = {
  ...freshGameState({ saveId: 'golden', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
  tutorial: { completedSteps: [], explanations: 'skipped' as const },
  entitlements: { goldenWallet: ['purchase-1'] },
};

describe('Golden wallet on Earn (#153)', () => {
  it('shows the gold wallet and pays double for a tap', async () => {
    const session = await startTestGameFrom(golden);
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/home' });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Tap card, Golden wallet, earns $2.00 per tap' }),
    );
    await act(() => session.game.flushTaps());
    expect<bigint>(session.game.getSnapshot().state.cashCents).toBe(200n);
  });
});
