import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { factoryBusiness } from '@/domain/testFactory';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openFactory(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['factory'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'make', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/manufacturer' });
  return session;
}

const factoryOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.factory;

describe('the Factory floor section (BUS20j)', () => {
  it('stays locked at Startup', async () => {
    await openFactory(ownedBusiness('manufacturer'));
    expect(screen.queryByRole('header', { name: 'Factory floor' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openFactory(factoryBusiness(), []);
    expect(screen.getByText('Products and bulk orders')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Products and bulk orders')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['factory']);
  });

  it('shows each product’s profit once tooled, and retools on a switch', async () => {
    const session = await openFactory(factoryBusiness());
    expect(screen.getByText('Price 125% · Buyers 70% · $4,836,800.00/day')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Product: Precision' }));
    expect(factoryOf(session)).toMatchObject({ product: 'precision', retoolDaysLeft: 2 });
    expect(
      await screen.findByText('Retooling: lines at half output until the day after next'),
    ).toBeOnTheScreen();
  });

  it('accepts a bulk offer as a running order', async () => {
    const session = await openFactory(factoryBusiness());
    expect(screen.getByText('Made before open-market sales · 0 of 2 running')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Accept / }));
    expect(factoryOf(session)).toMatchObject({ answeredOffer: 0, orders: [{ endsDay: 9 }] });
    expect(await screen.findByText(/batches made today · 1 of 2 running$/)).toBeOnTheScreen();
  });

  it('declines a bulk offer and waits for the next client', async () => {
    const session = await openFactory(factoryBusiness());
    await fireEvent.press(screen.getByRole('button', { name: 'Decline' }));
    expect(factoryOf(session)).toMatchObject({ answeredOffer: 0, orders: [] });
    expect(
      await screen.findByText('No offer today. A new client asks every few days'),
    ).toBeOnTheScreen();
  });

  it('offers automation at Global and adds it after confirming', async () => {
    await openFactory(factoryBusiness({}, { stage: 5, treasuryCents: dollars('8,000,000,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add automation · $7,500,000,000.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add automation' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
