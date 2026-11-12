import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { coffeeKioskBusiness } from '@/domain/testCoffeeKiosk';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openCoffeeKiosk(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['coffee_kiosk'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'kiosk', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/coffee_kiosk' });
  return session;
}

const kioskOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.coffeeKiosk;

describe('the Counter section (BUS20e)', () => {
  it('stays locked at Startup', async () => {
    await openCoffeeKiosk(ownedBusiness('coffee_kiosk'));
    expect(screen.queryByRole('header', { name: 'Counter' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openCoffeeKiosk(coffeeKioskBusiness(), []);
    expect(screen.getByText('Morning rush and beans')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Morning rush and beans')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['coffee_kiosk']);
  });

  it('shows how many rush customers walk away and marks the best plan', async () => {
    await openCoffeeKiosk(coffeeKioskBusiness());
    expect(
      screen.getByLabelText('Morning rush, 175 of 247 rush customers served, 72 walk away'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Rush plan: Pre-batch ★' })).toBeOnTheScreen();
  });

  it('switches the rush plan and serves the whole rush', async () => {
    const session = await openCoffeeKiosk(coffeeKioskBusiness());
    await fireEvent.press(screen.getByRole('radio', { name: 'Rush plan: Pre-batch ★' }));
    expect(kioskOf(session)).toMatchObject({ plan: 'prebatch' });
    expect(
      await screen.findByLabelText('Morning rush, All 234 rush customers served, No one waits'),
    ).toBeOnTheScreen();
  });

  it('switches beans and shows what the grade changes', async () => {
    const session = await openCoffeeKiosk(coffeeKioskBusiness({ plan: 'prebatch' }));
    expect(screen.getByText('Price 100% · Cost a cup 100% · Customers 100%')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Beans: Single origin ★' }));
    expect(kioskOf(session)).toMatchObject({ grade: 'single_origin' });
    expect(
      await screen.findByText('Price 115% · Cost a cup 140% · Customers 95%'),
    ).toBeOnTheScreen();
  });

  it('says the manager picks the plan when one is hired', async () => {
    const managed = { staff: { operations: 0, sales: 0, manager: 1 } };
    await openCoffeeKiosk(coffeeKioskBusiness({}, managed));
    expect(screen.getByText('Your manager picks the most profitable plan')).toBeOnTheScreen();
  });

  it('offers order-ahead at Global and adds it after confirming', async () => {
    await openCoffeeKiosk(coffeeKioskBusiness({}, { stage: 5, treasuryCents: dollars('650,000') }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add order-ahead · $600,000.00' }));
    expect(screen.getByRole('header', { name: 'Add order-ahead' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
