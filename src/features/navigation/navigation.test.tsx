import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGame } from '@/application/testGame';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

beforeEach(async () => {
  mockGame = Promise.resolve({ status: 'ready', game: (await startTestGame()).game });
});

const renderApp = (initialUrl = '/') => renderRouter('src/app', { initialUrl });

describe('app shell', () => {
  it('opens on Home with all five tabs visible', async () => {
    await renderApp();
    expect(screen).toHavePathname('/home');
    for (const tab of ['Home', 'Businesses', 'Markets', 'Properties', 'Portfolio']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${tab}`) })).toBeOnTheScreen();
    }
    expect(screen.getByLabelText('Cash $0.00')).toBeOnTheScreen();
  });

  it('opens Goals from the header', async () => {
    await renderApp();
    await fireEvent.press(screen.getByLabelText('Goals'));
    expect(screen).toHavePathname('/goals');
    expect(await screen.findByText('Worth $1B')).toBeOnTheScreen();
  });

  it('opens Settings from the header', async () => {
    await renderApp();
    await fireEvent.press(screen.getByLabelText('Settings'));
    expect(screen).toHavePathname('/settings');
    expect(await screen.findByText('All companies and coins are fictional.')).toBeOnTheScreen();
  });

  it('previews locked tiers with their unlock threshold', async () => {
    await renderApp('/businesses');
    expect(screen.getByText('Unlocks at $5,000.00 peak net worth')).toBeOnTheScreen();
    expect(screen.getByText('Unlocks at $8,000,000.00 peak net worth')).toBeOnTheScreen();
    expect(screen.getByText('Earns $10.00/min net')).toBeOnTheScreen();
  });

  it('switches Markets between stocks and crypto, with the fictional notice', async () => {
    await renderApp('/markets');
    expect(screen.getByText('Prism Labs')).toBeOnTheScreen();
    expect(screen.getByText('All companies and coins are fictional.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Crypto' }));
    expect(screen.getByText('Wag Coin')).toBeOnTheScreen();
    expect(screen.getByText('$0.10')).toBeOnTheScreen();
    expect(screen.queryByText('Prism Labs')).toBeNull();
  });
});
