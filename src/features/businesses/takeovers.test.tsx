import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const DAY_MS = 600_000;

const regional = (change: Partial<OwnedBusiness> = {}) =>
  ownedBusiness('vending', {
    stage: 3,
    units: 20,
    treasuryCents: dollars('10,000'),
    ...change,
  });

async function openVending(business: OwnedBusiness): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'rivals', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    clock: { simulationMs: 4 * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
    seenCoachMarks: ['vending'],
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/vending' });
  return session;
}

describe('the Deals section (BUS18)', () => {
  it('stays locked until the Regional stage', async () => {
    await openVending(ownedBusiness('vending', { stage: 2 }));
    expect(screen.getByText('Unlocks at Regional')).toBeOnTheScreen();
  });

  it('makes an offer after reviewing its chance and what a merger brings', async () => {
    const session = await openVending(regional());
    expect(screen.getByText('Hallway Treats Co.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Offer size: 90%' }));
    await fireEvent.press(
      screen.getByRole('button', { name: /^Make an offer for Snackpoint Machines/ }),
    );
    expect(
      screen.getByRole('header', { name: 'Offer to buy Snackpoint Machines' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('16%')).toBeOnTheScreen();
    expect(screen.getByText('25 machines')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Make offer · $3,800.52' }));
    expect(session.game.getSnapshot().state.businesses[0]?.takeovers.offer).toEqual({
      status: 'pending',
      rivalId: 'snackpoint',
      amountCents: dollars('3,800.52'),
    });
    expect(await screen.findAllByText(/Wait for your other offer/)).toHaveLength(2);
  });

  it('shows a rival that turned an offer down and one already merged', async () => {
    await openVending(
      regional({
        takeovers: {
          offer: { status: 'none' },
          locks: [{ rivalId: 'coinbright', untilDay: 7 }],
          merged: ['snackpoint'],
        },
      }),
    );
    expect(screen.getByText(/Merged into your business/)).toBeOnTheScreen();
    expect(screen.getByText(/Turned down your offer · Try again in 3 days/)).toBeOnTheScreen();
  });
});
