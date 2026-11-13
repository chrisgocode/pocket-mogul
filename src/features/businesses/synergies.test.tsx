import { CURRENT_ECONOMY_VERSION } from '@/content';
import { renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const DAY_MS = 600_000;

async function openBakery(businesses: readonly OwnedBusiness[]) {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'pairs', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    clock: { simulationMs: 4 * DAY_MS, lastWallCheckpointMs: 0 },
    businesses,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/bakery' });
}

describe('the Synergies section (BUS21)', () => {
  it('names the partner a locked synergy needs', async () => {
    await openBakery([ownedBusiness('bakery')]);
    expect(
      screen.getByText('0 of 2 active · owning related businesses helps both'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Own a Coffee Kiosk to unlock')).toBeOnTheScreen();
    expect(screen.getByText('Own a Food Cart to unlock')).toBeOnTheScreen();
  });

  it('shows a running synergy, one about to start and one about to end', async () => {
    await openBakery([
      ownedBusiness('bakery', { synergies: ['food_cart_orders_bakery'] }),
      ownedBusiness('coffee_kiosk'),
    ]);
    expect(screen.getByText('+6% customers')).toBeOnTheScreen();
    expect(
      screen.getByText('Your coffee kiosks sell your pastries every morning. Starts next day.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('You no longer own a Food Cart. Ends next day.')).toBeOnTheScreen();
  });

  it('counts a synergy both businesses are running', async () => {
    await openBakery([
      ownedBusiness('bakery', { synergies: ['coffee_kiosk_orders_bakery'] }),
      ownedBusiness('coffee_kiosk', { synergies: ['bakery_supplies_coffee_kiosk'] }),
    ]);
    expect(
      screen.getByText('1 of 2 active · owning related businesses helps both'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Your coffee kiosks sell your pastries every morning.'),
    ).toBeOnTheScreen();
  });
});
