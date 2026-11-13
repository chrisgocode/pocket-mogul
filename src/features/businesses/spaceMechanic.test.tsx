import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { spaceBusiness } from '@/domain/testSpace';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openSpace(
  business: OwnedBusiness,
  seenCoachMarks: readonly string[] = ['space'],
): Promise<TestGame> {
  const session = await startTestGameFrom({
    ...freshGameState({ saveId: 'lift', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
    businesses: [business],
    seenCoachMarks,
  });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/businesses/space_launch' });
  return session;
}

const spaceOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0]?.space;

describe('the Mission control section (BUS20l)', () => {
  it('stays locked at Startup', async () => {
    await openSpace(ownedBusiness('space_launch'));
    expect(screen.queryByRole('header', { name: 'Mission control' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '▸ Next unlocks' })).toBeOnTheScreen();
  });

  it('shows a coach mark when the mechanic unlocks, until the player dismisses it', async () => {
    const session = await openSpace(spaceBusiness(), []);
    expect(screen.getByText('Launch cadence and payloads')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText('Launch cadence and payloads')).not.toBeOnTheScreen();
    expect(session.game.getSnapshot().state.seenCoachMarks).toEqual(['space']);
  });

  it('shows the weather, the forecast and what each cadence launches today', async () => {
    await openSpace(spaceBusiness({ weather: 'storm' }));
    expect(screen.getByLabelText(/^Weather today: Storm, Next: \w+, then \w+$/)).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Launch cadence: Careful ★' })).toBeOnTheScreen();
    expect(screen.getByText('25% launches today · $2,240,000.00/day')).toBeOnTheScreen();
  });

  it('changes the launch cadence', async () => {
    const session = await openSpace(spaceBusiness());
    await fireEvent.press(screen.getByRole('radio', { name: 'Launch cadence: Rapid ★' }));
    expect(spaceOf(session)).toMatchObject({ cadence: 'rapid' });
  });

  it('accepts a payload offer as a running contract', async () => {
    const session = await openSpace(spaceBusiness());
    expect(
      screen.getByText('Launched before open-market payloads · 0 of 2 running'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Accept / }));
    expect(spaceOf(session)).toMatchObject({ answeredOffer: 0, contracts: [{ endsDay: 7 }] });
    expect(
      await screen.findByText(/contract payloads launched today · 1 of 2 running$/),
    ).toBeOnTheScreen();
  });

  it('offers reusable boosters at Global and adds them after confirming', async () => {
    await openSpace(spaceBusiness({}, { stage: 5, treasuryCents: dollars('120,000,000,000') }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add reusable boosters · $112,500,000,000.00' }),
    );
    expect(screen.getByRole('header', { name: 'Add reusable boosters' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));
    expect(await screen.findByText('Added')).toBeOnTheScreen();
  });
});
