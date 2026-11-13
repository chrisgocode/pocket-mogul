import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { airlineBusiness } from '@/domain/testAirline';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openAirline(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['airline'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'fly', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/airline' });
  return session;
}

const airlineOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.airline;

describe('the Operations section (BUS20k)', () => {
  it('stays locked at Startup', async () => {
    await openAirline(ownedBusiness('airline'));
    expect(screen.queryByRole('header', { name: 'Operations' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openAirline(airlineBusiness(), []);
    expect(screen.getByText('Routes and fuel')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Routes and fuel')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['airline']);
  });

  it('shows the fuel price, the forecast and each network’s profit', async () => {
    await openAirline(airlineBusiness({ fuel: 'expensive' }));
    expect(
      screen.getByLabelText(
        'Fuel today: Expensive, Fuel moves the cost of every seat, most on long routes, 180% cost',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Tomorrow')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Network: Regional ★' })).toBeOnTheScreen();
    expect(
      screen.getByText('Fare 138.5% · Seats 81.25% · Fuel 166% · $14,518,312.50/day'),
    ).toBeOnTheScreen();
  });

  it('changes network and says the fleet is repositioning', async () => {
    const session = await openAirline(airlineBusiness());
    await fireEvent.press(screen.getByRole('radio', { name: 'Network: Mixed ★' }));
    expect(airlineOf(session)).toMatchObject({ network: 'mixed', fleet: 'repositioning' });
    expect(
      await screen.findByText('Repositioning: fewer seats fly for the rest of today'),
    ).toBeOnTheScreen();
  });

  it('says the manager repositions overnight when one is hired', async () => {
    const managed = { staff: { operations: 0, sales: 0, manager: 1 } };
    await openAirline(airlineBusiness({}, managed));
    expect(
      screen.getByText('Your manager repositions overnight to the best network, at no cost'),
    ).toBeOnTheScreen();
  });

  it('offers an international hub at Global and adds it after confirming', async () => {
    await openAirline(airlineBusiness({}, { stage: 5, treasuryCents: dollars('40,000,000,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add an international hub · $37,500,000,000.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add an international hub' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
