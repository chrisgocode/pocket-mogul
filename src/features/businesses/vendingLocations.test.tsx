import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { VendingSpots } from '@/domain/business/vendingRules';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { vendingBusiness } from '@/domain/testVending';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openVending(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['vending'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'locations', economyVersion: 1, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/vending' });
  return session;
}

const spotsOf = (session: TestGame): VendingSpots | undefined => {
  const vending = session.game.getSnapshot().state.businesses[0]?.vending;
  return vending?.status === 'active' ? vending.spots : undefined;
};

const officeOf = (stock: number) => ({ office: { machines: 2, mix: 'balanced', stock } }) as const;
const button = (name: string) => screen.getByRole('button', { name });

describe('the Locations section (BUS20a)', () => {
  it('stays locked at Startup, so the first business shows only the shared core', async () => {
    await openVending(ownedBusiness('vending'));
    expect(
      screen.getByLabelText(
        'Locations and stock, Place machines at five locations, pick what they sell and keep them stocked, Unlocks at Local',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('radiogroup', { name: 'Office mix' })).not.toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openVending(vendingBusiness(officeOf(600)), []);
    expect(screen.getByText('New at Local: locations and stock')).toBeOnTheScreen();
    await fireEvent.press(button('Got it'));
    expect(screen.queryByText('New at Local: locations and stock')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['vending']);
  });

  it('marks a location out of stock and restocks it in one tap from the treasury (AC42)', async () => {
    const session = await openVending(
      vendingBusiness(officeOf(0), { treasuryCents: dollars('10') }),
    );
    expect(
      screen.getByLabelText('Office, 2/120 machines · Traffic 100%, Out of stock'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Customers per day, 0 of 0 served, capacity 0')).toBeOnTheScreen();
    await fireEvent.press(button('Restock Office, $4.00'));
    expect(
      await screen.findByLabelText('Office, 2/120 machines · Traffic 100%, Stock 600/600'),
    ).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.businesses[0]?.treasuryCents).toBe(dollars('6'));
  });

  it('restocks every location at once', async () => {
    const session = await openVending(
      vendingBusiness(
        { ...officeOf(100), gym: { machines: 1, mix: 'healthy', stock: 0 } },
        { treasuryCents: dollars('20') },
      ),
    );
    await fireEvent.press(button('Restock all · $7.00'));
    expect(
      await screen.findByRole('button', { name: 'Every location is stocked' }),
    ).toBeOnTheScreen();
    expect(spotsOf(session)).toMatchObject({ office: { stock: 600 }, gym: { stock: 300 } });
  });

  it('places a machine at another location and picks its mix, starring the best match', async () => {
    const session = await openVending(vendingBusiness(officeOf(600)));
    await fireEvent.press(button('Place a machine at the School'));
    expect(
      await screen.findByLabelText('School, 1/25 machines · Traffic 120%, Stock 300/300'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Match 115% · Best here: Snacks')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'School mix: Snacks ★' }));
    expect(await screen.findByText('Match 136% · Best here: Snacks')).toBeOnTheScreen();
    expect(spotsOf(session)?.school).toEqual({ machines: 1, mix: 'snacks', stock: 300 });
    expect(button('School is fully stocked')).toBeDisabled();
  });

  it('offers card readers at Global and installs them after confirming', async () => {
    await openVending(
      vendingBusiness(officeOf(600), { stage: 5, treasuryCents: dollars('40,000') }),
    );
    await fireEvent.press(button('Install card readers · $37,500.00'));
    expect(screen.getByRole('header', { name: 'Install card readers' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(
      await screen.findByLabelText('Card readers, +20% customers at every price, Installed'),
    ).toBeOnTheScreen();
  });
});
