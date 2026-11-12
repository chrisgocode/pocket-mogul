import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { laundromatBusiness } from '@/domain/testLaundromat';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const twoAttendants = { staff: { operations: 2, sales: 0, manager: 0 } };

async function openLaundromat(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['laundromat'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'wash', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/laundromat' });
  return session;
}

const laundromatOf = (session: TestGame) =>
  session.game.getSnapshot().state.businesses[0]?.laundromat;

describe('the Floor section (BUS20f)', () => {
  it('stays locked at Startup', async () => {
    await openLaundromat(ownedBusiness('laundromat'));
    expect(screen.queryByRole('header', { name: 'Floor' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openLaundromat(laundromatBusiness(), []);
    expect(screen.getByText('Machine mix and service washes')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Machine mix and service washes')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['laundromat']);
  });

  it('marks the best jumbo share and serves big loads once chosen', async () => {
    const session = await openLaundromat(laundromatBusiness());
    expect(
      screen.getByLabelText(
        'Jumbo machines, No jumbo machines: big loads go in the standard ones, 160% price',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Jumbo share: 40% ★' }));
    expect(laundromatOf(session)).toMatchObject({ jumboPercent: 40 });
    expect(
      await screen.findByLabelText(
        'Jumbo machines, 140 of 165 big-load customers served, 160% price',
      ),
    ).toBeOnTheScreen();
  });

  it('asks for an attendant before offering service washes', async () => {
    await openLaundromat(laundromatBusiness());
    expect(
      screen.getByText('Hire an attendant in Staff to offer service washes'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Service washes: Level 1' })).not.toBeOnTheScreen();
  });

  it('offers one service level per attendant and sets it', async () => {
    const session = await openLaundromat(laundromatBusiness({}, twoAttendants));
    expect(screen.queryByRole('radio', { name: 'Service washes: Level 3' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Service washes: Level 2' }));
    expect(laundromatOf(session)).toMatchObject({ serviceLevel: 2 });
    expect(
      await screen.findByText('100 drop-off loads a day · One level per attendant'),
    ).toBeOnTheScreen();
  });

  it('offers pickup and delivery at Global and adds it after confirming', async () => {
    await openLaundromat(laundromatBusiness({}, { stage: 5, treasuryCents: dollars('1,200,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add pickup and delivery · $1,125,000.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add pickup and delivery' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
