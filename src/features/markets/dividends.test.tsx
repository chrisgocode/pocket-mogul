import { renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom } from '@/application/testGame';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars, units } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const MINUTE_MS = 60_000;

async function open(initialUrl: string, overrides: Partial<GameState> = {}): Promise<void> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'holder', economyVersion: 1, wallMs: 0 }),
    cashCents: dollars('1,000'),
    tradingUnlocked: true,
    clock: { simulationMs: 20 * MINUTE_MS, lastWallCheckpointMs: 0 },
    ...overrides,
  });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
}

const heldPrism = {
  instrumentId: 'prism',
  quantity: units('10'),
  remainingBasisCents: dollars('250'),
  realizedProfitCents: dollars('0'),
};

const pendingPrism = {
  instrumentId: 'prism',
  pendingCents: dollars('0.06'),
  entitlementNumerator: 0n,
};

describe('Stock dividends', () => {
  it('shows the hourly estimate, pending dividends and the next payout (UX01)', async () => {
    await open('/markets/prism', { positions: [heldPrism], dividends: [pendingPrism] });
    expect(await screen.findByLabelText('Estimated dividends, $0.20 an hour')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pending dividends, $0.06')).toBeOnTheScreen();
    expect(screen.getByLabelText('Next payout, in 40 market minutes')).toBeOnTheScreen();
  });

  it('still shows pending dividends after every share is sold (AC18)', async () => {
    await open('/markets/prism', { dividends: [pendingPrism] });
    expect(await screen.findByLabelText('Pending dividends, $0.06')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Estimated dividends/)).not.toBeOnTheScreen();
  });

  it('shows no dividend card before any shares are held', async () => {
    await open('/markets/prism');
    expect(await screen.findByLabelText(/Dividend, \$0\.02/)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Pending dividends/)).not.toBeOnTheScreen();
  });
});
