import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { gymBusiness } from '@/domain/testGym';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const threeStudios = { units: 3 };

async function openGym(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['gym'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'gym', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/gym_chain' });
  return session;
}

const gymOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.gym;

describe('the Members section (BUS20h)', () => {
  it('stays locked at Startup', async () => {
    await openGym(ownedBusiness('gym_chain'));
    expect(screen.queryByRole('header', { name: 'Members' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openGym(gymBusiness(), []);
    expect(screen.getByText('Memberships and classes')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Memberships and classes')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['gym']);
  });

  it('shows who joins and leaves and where each tier settles', async () => {
    await openGym(gymBusiness({ members: 20_000 }, threeStudios));
    expect(
      screen.getByLabelText(
        'Members, 900 join and 600 leave a day · 10000 of 60000 studio visits, 20000/120000',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('$3.00 a day · 3% leave a day · settles at 30000')).toBeOnTheScreen();
    expect(screen.getByText('$6.50 a day · 8% leave a day · settles at 11250')).toBeOnTheScreen();
  });

  it('puts a higher tier on sale', async () => {
    const session = await openGym(gymBusiness({ members: 20_000 }, threeStudios));
    await fireEvent.press(screen.getByRole('radio', { name: 'Tier on sale: Elite' }));
    expect(gymOf(session)).toMatchObject({ tier: 'elite', members: 20_000 });
    expect(
      await screen.findByLabelText(/^Members, 900 join and 1600 leave a day/),
    ).toBeOnTheScreen();
  });

  it('adds classes, which keep members longer', async () => {
    const session = await openGym(gymBusiness({ members: 20_000 }, threeStudios));
    await fireEvent.press(screen.getByRole('radio', { name: 'Classes: Level 2' }));
    expect(gymOf(session)).toMatchObject({ classLevel: 2 });
    expect(
      await screen.findByText('$3.00 a day · 2% leave a day · settles at 45000'),
    ).toBeOnTheScreen();
  });

  it('says the manager runs the classes when one is hired', async () => {
    const managed = { staff: { operations: 0, sales: 0, manager: 1 } };
    await openGym(gymBusiness({}, managed));
    expect(
      screen.getByText(
        'Your manager adds classes while studios have room and trims them when full',
      ),
    ).toBeOnTheScreen();
  });

  it('offers 24-hour access at Global and adds it after confirming', async () => {
    await openGym(gymBusiness({}, { stage: 5, treasuryCents: dollars('160,000,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add 24-hour access · $150,000,000.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add 24-hour access' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
