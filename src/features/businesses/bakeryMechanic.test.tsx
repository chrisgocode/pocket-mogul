import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { bakeryBusiness } from '@/domain/testBakery';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const threeOvens = { units: 3 };

async function openBakery(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['bakery'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'bake', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/bakery' });
  return session;
}

const bakeryOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.bakery;

describe('the Ovens section (BUS20g)', () => {
  it('stays locked at Startup', async () => {
    await openBakery(ownedBusiness('bakery'));
    expect(screen.queryByRole('header', { name: 'Ovens' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openBakery(bakeryBusiness(), []);
    expect(screen.getByText('Oven schedule and wholesale')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Oven schedule and wholesale')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['bakery']);
  });

  it('shows what goes stale and stops the waste at the best bake level', async () => {
    const session = await openBakery(bakeryBusiness({}, threeOvens));
    expect(
      screen.getByLabelText('Retail shelf, 2420 of 3000 baked orders sold, 580 go stale'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Bake level: 80% ★' }));
    expect(bakeryOf(session)).toMatchObject({ bakePercent: 80 });
    expect(
      await screen.findByLabelText('Retail shelf, 2400 of 2400 baked orders sold, Sold out'),
    ).toBeOnTheScreen();
  });

  it('accepts a wholesale offer as a running order', async () => {
    const session = await openBakery(bakeryBusiness({}, threeOvens));
    expect(screen.getByText('Baked before retail · 0 of 2 running')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Accept / }));
    expect(bakeryOf(session)).toMatchObject({ answeredOffer: 0, orders: [{ priceBps: 8500 }] });
    expect(await screen.findByText('Baked before retail · 1 of 2 running')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Accept / })).not.toBeOnTheScreen();
  });

  it('declines a wholesale offer and waits for the next client', async () => {
    const session = await openBakery(bakeryBusiness());
    await fireEvent.press(screen.getByRole('button', { name: 'Decline' }));
    expect(bakeryOf(session)).toMatchObject({ answeredOffer: 0, orders: [] });
    expect(
      await screen.findByText('No offer today. A new client asks every couple of days'),
    ).toBeOnTheScreen();
  });

  it('offers a central kitchen at Global and adds it after confirming', async () => {
    await openBakery(bakeryBusiness({}, { stage: 5, treasuryCents: dollars('16,000,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add a central kitchen · $15,000,000.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add a central kitchen' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
