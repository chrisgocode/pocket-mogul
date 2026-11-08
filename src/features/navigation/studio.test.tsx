import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { OpenedGame } from '@/application/game';
import { startTestGameFrom } from '@/application/testGame';
import { CURRENT_ECONOMY_VERSION } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { ownedBusiness } from '@/domain/testRules';
import { vendingBusiness } from '@/domain/testVending';
import { dollars, units } from '@/domain/money';
import type { GameState } from '@/domain/gameState';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));
async function open(initialUrl: string, patch: Partial<GameState> = {}) {
  const seeded = {
    ...freshGameState({
      saveId: 'studio-native',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: 0,
    }),
    cashCents: dollars('2000'),
    ...patch,
  };
  const session = await startTestGameFrom(seeded);
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

describe('Studio native flows', () => {
  it('opens an empty business from Earn and resolves its stock issue with the real command', async () => {
    const business = vendingBusiness(
      { office: { machines: 2, mix: 'balanced', stock: 0 } },
      { treasuryCents: dollars('10') },
    );
    const session = await open('/home', { businesses: [business] });
    await fireEvent.press(screen.getByRole('button', { name: /^Restock Vending Machine/ }));
    expect(screen).toHavePathname('/businesses/vending');
    await fireEvent.press(screen.getByRole('button', { name: 'Restock all · $4.00' }));
    expect(
      await screen.findByRole('button', { name: 'Every location is stocked' }),
    ).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.businesses[0]?.treasuryCents).toBe(dollars('6'));
  });

  it('keeps Startup mechanics hidden and exposes the Local controls', async () => {
    await open('/businesses/vending', { businesses: [ownedBusiness('vending')] });
    expect(screen.queryByRole('header', { name: 'Locations' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Risks' })).not.toBeOnTheScreen();
    expect(screen.getByText('TIER 1 · STARTUP')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Daily figures' })).toBeOnTheScreen();
  });

  it('shows personal loss and basis in Portfolio and unit price in Explore', async () => {
    await open('/markets', {
      positions: [
        {
          instrumentId: 'prism',
          quantity: units('10'),
          remainingBasisCents: dollars('300'),
          realizedProfitCents: dollars('0'),
        },
      ],
    });
    expect(screen.getByText('10 held · avg $30.00')).toBeOnTheScreen();
    expect(screen.getByText('-$50.00 · -16.67%')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Explore' }));
    await fireEvent.changeText(screen.getByLabelText('Search markets'), 'przm');
    expect(screen.getAllByRole('button', { name: /this market hour$/ })).toHaveLength(1);
    expect(screen.getByText('$25.00')).toBeOnTheScreen();
  });

  it('changes the news feed with the selected coin market', async () => {
    await open('/markets');
    await fireEvent.press(screen.getByRole('tab', { name: 'Crypto' }));
    await fireEvent.press(screen.getByRole('button', { name: '▸ Market news' }));
    expect(screen.getByText('A large Spark Token holder sells a big chunk')).toBeOnTheScreen();
  });

  it('shows tax choices but prevents filing a still-open estimate', async () => {
    await open('/taxes', { tax: { status: 'notStarted' } });
    expect(screen.getByRole('button', { name: 'Pay & file' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Don’t report' })).toBeDisabled();
  });
});
