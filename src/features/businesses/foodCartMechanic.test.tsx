import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { foodCartBusiness } from '@/domain/testFoodCart';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const QUIET_TOWN = {
  park: 'quiet',
  offices: 'steady',
  campus: 'quiet',
  market: 'busy',
  stadium: 'quiet',
} as const;

async function openFoodCart(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['food_cart'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'cart', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/food_cart' });
  return session;
}

const foodCartOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.foodCart;

describe('the Street section (BUS20d)', () => {
  it('stays locked at Startup', async () => {
    await openFoodCart(ownedBusiness('food_cart'));
    expect(screen.queryByRole('header', { name: 'Street' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openFoodCart(foodCartBusiness(), []);
    expect(screen.getByText('Spot and menu')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Spot and menu')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['food_cart']);
  });

  it('shows every spot with today’s crowd and marks where the cart is parked', async () => {
    await openFoodCart(foodCartBusiness({ crowds: QUIET_TOWN }));
    expect(
      screen.getByLabelText(/^Park, Quiet today · \w+ tomorrow, 80% customers, Parked here$/),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: /^Move to Night market, Busy today · \w+ tomorrow, 170% customers$/,
      }),
    ).toBeOnTheScreen();
  });

  it('moves the cart to the spot the player taps', async () => {
    const session = await openFoodCart(foodCartBusiness({ crowds: QUIET_TOWN }));
    await fireEvent.press(screen.getByRole('button', { name: /^Move to Night market/ }));
    expect(foodCartOf(session)).toMatchObject({ spot: 'market' });
    expect(await screen.findByLabelText(/^Night market, .*Parked here$/)).toBeOnTheScreen();
  });

  it('tells the player what a menu item would earn today, and adds it', async () => {
    const session = await openFoodCart(foodCartBusiness({ crowds: QUIET_TOWN }));
    expect(
      screen.getByHintText('Order size 120% · Serving speed 80% · Adding it today: +$71.10 a day'),
    ).toBeOnTheScreen();
    await fireEvent(screen.getByLabelText('Combo meals'), 'valueChange', true);
    expect(foodCartOf(session)).toMatchObject({ menu: { combo: 'offered' } });
    expect(
      await screen.findByHintText(
        'Order size 120% · Serving speed 80% · Taking it off today: -$71.10 a day',
      ),
    ).toBeOnTheScreen();
  });

  it('says the manager parks the cart when one is hired', async () => {
    const managed = { staff: { operations: 0, sales: 0, manager: 1 } };
    await openFoodCart(foodCartBusiness({}, managed));
    expect(
      screen.getByText('Your manager parks at the busiest spot every morning'),
    ).toBeOnTheScreen();
  });

  it('offers a second window at Global and adds it after confirming', async () => {
    await openFoodCart(foodCartBusiness({}, { stage: 5, treasuryCents: dollars('200,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add a second window · $187,500.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add a second window' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
