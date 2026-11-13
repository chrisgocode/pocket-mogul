import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { OwnedCollectible } from '@/domain/collection/rules';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const DINGHY: OwnedCollectible = {
  pieceId: 'puffin_dinghy',
  acquiredDay: 0,
  paidCents: dollars('941.67'),
};

async function open(
  cash: string,
  { collectibles = [] as OwnedCollectible[], initialUrl = '/collection' } = {},
): Promise<TestGame> {
  const fresh = freshGameState({
    saveId: 'collector',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: 0,
  });
  const session = await startTestGameFrom({ ...fresh, cashCents: dollars(cash), collectibles });
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

const confirm = () => fireEvent.press(screen.getByRole('button', { name: /^Confirm/ }));

describe('the Collection screen (COL01)', () => {
  it('opens from Profile', async () => {
    await open('3,000', { initialUrl: '/portfolio' });
    await fireEvent.press(screen.getByRole('button', { name: 'Collection' }));
    expect(await screen.findByText('Auction house')).toBeOnTheScreen();
  });

  it('shows three lots, an empty collection and what the player cannot afford yet', async () => {
    await open('3,000');
    expect(screen.getByText('New lots in 6 days · 3 lots every 6 days')).toBeOnTheScreen();
    expect(screen.getByText('0 of 60')).toBeOnTheScreen();
    expect(screen.getByText(/^Nothing yet\./)).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Osprey Bay Cruiser, Need $814.40 more' }),
    ).toBeDisabled();
  });

  it('buys a lot after a review and lists it under Your pieces', async () => {
    const session = await open('3,000');
    await fireEvent.press(screen.getByRole('button', { name: 'Puffin Dinghy, Buy · $941.67' }));
    expect(screen.getByRole('header', { name: 'Buy Puffin Dinghy' })).toBeOnTheScreen();
    expect(screen.getByText('-$941.67')).toBeOnTheScreen();
    await confirm();
    expect(
      await screen.findByRole('button', { name: 'Puffin Dinghy, In your collection' }),
    ).toBeDisabled();
    expect(screen.getByText('1 of 60')).toBeOnTheScreen();
    expect(screen.getByText('Bought today · $0.00 since you bought it')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.collectibles).toEqual([DINGHY]);
  });

  it('sells a piece for 90 percent of its appraised value', async () => {
    const session = await open('100', { collectibles: [DINGHY] });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Sell Puffin Dinghy, Sell · +$847.50' }),
    );
    expect(screen.getByRole('header', { name: 'Sell Puffin Dinghy' })).toBeOnTheScreen();
    expect(screen.getByText('90% of appraised value')).toBeOnTheScreen();
    expect(screen.getByText('Tax basis consumed')).toBeOnTheScreen();
    await confirm();
    expect(await screen.findByText(/^Nothing yet\./)).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.collectibles).toEqual([]);
  });
});
