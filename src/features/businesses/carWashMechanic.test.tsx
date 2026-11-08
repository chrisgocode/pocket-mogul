import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { carWashBusiness } from '@/domain/testCarWash';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openCarWash(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['car_wash'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'wash', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/car_wash' });
  await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
  return session;
}

const carWashOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.carWash;

describe('the Washes section (BUS20b)', () => {
  it('stays locked at Startup', async () => {
    await openCarWash(ownedBusiness('car_wash'));
    expect(screen.queryByRole('header', { name: 'Washes' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openCarWash(carWashBusiness(), []);
    expect(screen.getByText('Packages and memberships')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Packages and memberships')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['car_wash']);
  });

  it('shows today’s weather and the next three days (AC37)', async () => {
    await openCarWash(carWashBusiness({ weather: 'after_rain' }));
    expect(
      screen.getByLabelText('Today: After rain, Weather moves walk-in customers, 160% walk-ins'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Tomorrow')).toBeOnTheScreen();
    expect(screen.getByText('In 3 days')).toBeOnTheScreen();
  });

  it('turns Ultimate off, moving its walk-ins to Deluxe', async () => {
    const session = await openCarWash(carWashBusiness());
    await fireEvent(screen.getByLabelText('Ultimate'), 'valueChange', false);
    expect(carWashOf(session)).toMatchObject({
      packages: { deluxe: 'offered', ultimate: 'withdrawn' },
    });
    expect(await screen.findByLabelText('Basic, $20.80 · Bay time 75%, 60%')).toBeOnTheScreen();
  });

  it('sets the membership price and member cap', async () => {
    const session = await openCarWash(carWashBusiness({ members: 40 }));
    expect(
      screen.getByLabelText('Members, $12.00 a day each · 20 join a day, 40/200'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Memberships')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Membership price: Budget' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Member cap: 40%' }));
    expect(carWashOf(session)).toMatchObject({ membershipLevel: 'budget', memberCapPercent: 40 });
    expect(
      await screen.findByLabelText('Members, $8.40 a day each · 29 join a day, 40/400'),
    ).toBeOnTheScreen();
  });

  it('offers detailing at Global and adds it after confirming', async () => {
    await openCarWash(carWashBusiness({}, { stage: 5, treasuryCents: dollars('5,000,000') }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add detailing · $4,500,000.00' }));
    expect(screen.getByRole('header', { name: 'Add detailing' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
    expect(screen.getByLabelText('Detailing, $104.00 · Bay time 360%, 10%')).toBeOnTheScreen();
  });
});
