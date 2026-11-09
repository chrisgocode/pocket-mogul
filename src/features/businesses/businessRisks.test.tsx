import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

const DAY_MS = 600_000;

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openVending(business: Partial<OwnedBusiness>, day = 0): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'risks', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [ownedBusiness('vending', business)],
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/vending' });
  return session;
}

const row = (text: string) => screen.getByLabelText(text);

describe('the Risks section', () => {
  it('defers risk controls until Local', async () => {
    await openVending({});
    expect(screen.queryByRole('header', { name: 'Risks' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Insure/ })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('insures a category in one tap and shows the premium in the day figures', async () => {
    const session = await openVending({ stage: 2, treasuryCents: dollars('50') }, 40);
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Insure equipment risks, $2.80/day' }),
    );
    expect(await screen.findByLabelText('Insurance, -$2.80/day')).toBeOnTheScreen();
    expect(screen.getByLabelText('Profit, $97.20/day')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.businesses[0]?.insurance.equipment).toBe('active');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel equipment insurance' }));
    expect(await screen.findByLabelText('Profit, $100.00/day')).toBeOnTheScreen();
  });

  it('shows a lapsed policy with a Renew button', async () => {
    await openVending({
      stage: 2,
      insurance: { equipment: 'lapsed', liability: 'none', supply: 'none' },
    });
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(
      screen.getByRole('button', { name: 'Renew equipment risks, $2.80/day' }),
    ).toBeOnTheScreen();
  });

  it('shows an active incident and its days left', async () => {
    await openVending(
      {
        incident: {
          status: 'active',
          incidentId: 'vending_breakdown',
          endsDay: 34,
          capacityBps: 7000,
          costBps: 10_000,
        },
      },
      31,
    );
    await fireEvent.press(screen.getByRole('button', { name: '▸ Daily figures' }));
    expect(row('Breakdown now, Capacity down 30%, 3 days left')).toBeOnTheScreen();
    expect(row('Customers per day, 70 of 110 served, capacity 70')).toBeOnTheScreen();
  });
});
