import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom } from '@/application/testGame';
import { freshGameState } from '@/domain/gameState';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const vip = {
  ...freshGameState({ saveId: 'vip', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
  tutorial: { completedSteps: [], explanations: 'skipped' as const },
  entitlements: { vipPass: ['purchase-1'], removeAds: ['purchase-1'] },
};

describe('VIP pass on Earn (#152)', () => {
  it('starts Tap Boost at a press without playing an ad', async () => {
    const session = await startTestGameFrom(vip);
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/home' });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Tap Boost, Start boost · 5x for 60s' }),
    );
    expect(await screen.findByRole('button', { name: 'Tap Boost, Boost running' })).toBeDisabled();
    expect(session.ads.shows()).toBe(0);
  });
});
