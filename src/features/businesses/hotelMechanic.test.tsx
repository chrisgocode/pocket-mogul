import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { hotelBusiness } from '@/domain/testHotel';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openHotel(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['hotel'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'stay', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/hotel_group' });
  return session;
}

const businessOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0];

describe('the Front desk section (BUS20i)', () => {
  it('stays locked at Startup', async () => {
    await openHotel(ownedBusiness('hotel_group'));
    expect(screen.queryByRole('header', { name: 'Front desk' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openHotel(hotelBusiness(), []);
    expect(screen.getByText('Seasons and stars')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Seasons and stars')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['hotel']);
  });

  it('shows the season, what is coming and the star rating', async () => {
    await openHotel(hotelBusiness({ season: 'event' }));
    expect(
      screen.getByLabelText(
        'Now: Event season, Seasons move how many guests want a room, 180% guests',
      ),
    ).toBeOnTheScreen();
    expect(screen.getAllByText(/^Next, in \d days?$/)).toHaveLength(2);
    expect(
      screen.getByLabelText(
        '1 of 5 stars, 0 of 1 housekeepers: hire more in Staff for a star · One more star every 5 Quality levels, 100% price',
      ),
    ).toBeOnTheScreen();
  });

  it('plans a rate for a later season without changing today’s price', async () => {
    const session = await openHotel(hotelBusiness({ season: 'shoulder' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Event season: Luxury' }));
    expect(businessOf(session)).toMatchObject({
      priceLevel: 'standard',
      hotel: { rates: { event: 'luxury' } },
    });
  });

  it('applies the rate for the season in progress at once', async () => {
    const session = await openHotel(hotelBusiness({ season: 'shoulder' }));
    expect(screen.getByText('100% guests · In season now')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Shoulder season: Premium' }));
    expect(businessOf(session)).toMatchObject({
      priceLevel: 'premium',
      hotel: { rates: { shoulder: 'premium' } },
    });
  });

  it('offers a conference centre at Global and adds it after confirming', async () => {
    await openHotel(hotelBusiness({}, { stage: 5, treasuryCents: dollars('1,600,000,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add a conference centre · $1,500,000,000.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add a conference centre' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
