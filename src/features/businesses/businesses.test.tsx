import { CURRENT_ECONOMY_VERSION } from '@/content';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openWith(cash: string, initialUrl = '/businesses'): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'saver', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    cashCents: dollars(cash),
  });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

const buyVending = () => screen.getByRole('button', { name: /^Buy Vending Machine/ });

describe('Businesses tab', () => {
  it('lists the Tier 1 catalog with profit per business day and previews locked tiers', async () => {
    await openWith('100');
    expect(screen.getByText('Profit $100.00/day')).toBeOnTheScreen();
    expect(buyVending()).toBeDisabled();
    expect(screen.getByText('Need $150.00 more')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Tier 2' }));
    expect(screen.getByText('Unlocks at $5,000.00 peak net worth')).toBeOnTheScreen();
    expect(screen.getByText('Laundromat')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Buy Laundromat/ })).not.toBeOnTheScreen();
  });

  it('buys a Vending Machine through the confirmation sheet and earns at once', async () => {
    const session = await openWith('300');
    await fireEvent.press(buyVending());
    expect(screen.getByText('-$250.00')).toBeOnTheScreen();
    expect(screen.getByText('+$100.00/day to its treasury')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm purchase/ }));
    expect(await screen.findByLabelText('Cash $50.00')).toBeOnTheScreen();
    expect(screen.getByText('Owned')).toBeOnTheScreen();
    expect(screen.getByText('1 owned · $5.00/min to cash')).toBeOnTheScreen();

    await act(async () => {
      session.clock.advance(30_000);
      await session.game.flushTaps();
    });
    expect(screen.getByLabelText('Cash $52.50')).toBeOnTheScreen();
  });

  it('shows the balance growing between saves', async () => {
    const session = await openWith('250');
    await fireEvent.press(buyVending());
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm purchase/ }));
    expect(await screen.findByLabelText('Cash $0.00')).toBeOnTheScreen();
    await act(() => session.clock.advance(3_000));
    expect(screen.getByLabelText('Cash $0.25')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.revision).toBe(1);
  });

  it('shows net passive income on Home', async () => {
    const session = await openWith('250', '/home');
    await act(() =>
      session.game.dispatch({ id: 'buy', command: { type: 'BuyBusiness', businessId: 'vending' } }),
    );
    expect(screen.getAllByText('$5.00/min')[0]).toBeOnTheScreen();
  });
});
