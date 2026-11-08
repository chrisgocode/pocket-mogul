import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { ContractOffer } from '@/domain/business/deliveryState';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { activeDelivery, contract, deliveryBusiness } from '@/domain/testDelivery';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const offer: ContractOffer = {
  id: '0-0',
  clientId: 'brightcart',
  parcelsPerDay: 5000,
  rateCents: dollars('11.50'),
  penaltyCents: dollars('23'),
  days: 4,
  postedDay: 0,
};

const DAY_MS = 600_000;

async function openDelivery(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['delivery'],
  day = 0,
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'vans', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/delivery' });
  return session;
}

const deliveryOf = (session: TestGame) =>
  activeDelivery(session.game.getSnapshot().state.businesses[0]);

describe('the Contracts section (BUS20c)', () => {
  it('stays locked at Startup and warns that vans will need drivers', async () => {
    await openDelivery(ownedBusiness('delivery'));
    expect(
      screen.getByText(
        'Take on client contracts. From Local, each driver runs 2 vans and a van without a driver delivers nothing',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Efficiency 0/20')).toBeOnTheScreen();
  });

  it('says what Local unlocks and warns about vans without drivers before growing', async () => {
    const startup = ownedBusiness('delivery', { units: 3, treasuryCents: dollars('600,000') });
    await openDelivery(startup, ['delivery'], 3);
    await fireEvent.press(screen.getByRole('button', { name: 'Grow to Local · $500,000.00' }));
    expect(screen.getByRole('header', { name: 'Grow to Local' })).toBeOnTheScreen();
    expect(screen.getByText('Contracts and drivers')).toBeOnTheScreen();
    expect(screen.getByText('3 stop delivering')).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openDelivery(deliveryBusiness(), []);
    expect(screen.getByText('Contracts and drivers')).toBeOnTheScreen();
    expect(screen.getByText('Unlocked at the Local stage')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Contracts and drivers')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['delivery']);
  });

  it('names drivers, the route planner and the fleet', async () => {
    await openDelivery(deliveryBusiness());
    expect(screen.getByText('Driving 1/5')).toBeOnTheScreen();
    expect(screen.getByText('Route planner 0/20')).toBeOnTheScreen();
    expect(screen.getByText('2 of 2 · 2 per driver')).toBeOnTheScreen();
    expect(screen.getByText('★★★☆☆')).toBeOnTheScreen();
  });

  it('accepts an offer after reviewing its terms and profit', async () => {
    const session = await openDelivery(deliveryBusiness({ offers: [offer] }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Review the Brightcart Online contract' }),
    );
    expect(screen.getByRole('header', { name: 'Accept Brightcart Online' })).toBeOnTheScreen();
    expect(screen.getByText('$98,440.00/day → $145,440.00/day')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Accept contract' }));
    expect(deliveryOf(session)).toMatchObject({
      offers: [],
      contracts: [{ id: '0-0', endsDay: 4 }],
    });
    expect(await screen.findByText('All delivered · $11.50 each · 4 days left')).toBeOnTheScreen();
    expect(screen.getByText('$57,500.00/day')).toBeOnTheScreen();
  });

  it('declines an offer in one tap', async () => {
    const session = await openDelivery(deliveryBusiness({ offers: [offer] }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Decline the Brightcart Online contract' }),
    );
    expect(deliveryOf(session).offers).toEqual([]);
    expect(
      await screen.findByText('No offers on the board. New ones arrive tomorrow.'),
    ).toBeOnTheScreen();
  });

  it('shows missed parcels and penalties when a contract outgrows the vans (AC41)', async () => {
    await openDelivery(deliveryBusiness({ contracts: [contract({ parcelsPerDay: 30_000 })] }));
    expect(screen.getByText('6,000 missed a day at $25.00 each · 5 days left')).toBeOnTheScreen();
    expect(screen.getByText('-$150,000.00/day')).toBeOnTheScreen();
    expect(screen.getByText('0 parcels/day')).toBeOnTheScreen();
  });

  it('shows the loss from a van no one can drive', async () => {
    await openDelivery(deliveryBusiness({}, { staff: { operations: 0, sales: 0, manager: 0 } }));
    expect(screen.getByText('-$14,000.00/day')).toBeOnTheScreen();
    expect(screen.getByText('0 of 2 · 2 per driver')).toBeOnTheScreen();
  });

  it('builds the sorting hub at Global after confirming', async () => {
    await openDelivery(deliveryBusiness({}, { stage: 5, treasuryCents: dollars('40,000,000') }));
    await fireEvent.press(screen.getByRole('button', { name: 'Build · $37,500,000.00' }));
    expect(screen.getByRole('header', { name: 'Build a sorting hub' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Built')).toBeOnTheScreen();
  });
});
