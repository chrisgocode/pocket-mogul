import { CURRENT_ECONOMY_VERSION } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { PURCHASE_CATALOGUE } from '@/application/purchaseCatalogue';
import { purchasePolicy as testPolicy } from '@/application/purchaseTesting';
import { scriptedBilling } from '@/application/scriptedBilling';
import { startTestGameFrom } from '@/application/testGame';
import type { Entitlements } from '@/domain/entitlements';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const purchasePolicy = {
  scopes: testPolicy.scopes,
  products: PURCHASE_CATALOGUE.map(({ productId, entitlements }) => ({
    productId,
    entitlements,
    productClass: 'nonConsumable' as const,
  })),
};

const products = [
  {
    productId: 'pm_collectors_pass',
    displayName: 'Collector’s Pass',
    displayPrice: '$2.99',
    price: 2.99,
  },
];

const LOCKED =
  "Locked · Collector's pass: Railway Share Certificate, Brass Ticker Machine, Bank Vault Door, Exchange Opening Bell, Solid Gold Briefcase";

async function open(entitlements: Entitlements, store: 'open' | 'closed'): Promise<void> {
  const fresh = freshGameState({
    saveId: 'collector',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: 0,
  });
  const billing = scriptedBilling({ completionOwner: 'application', products });
  const session = await startTestGameFrom(
    { ...fresh, cashCents: dollars('3,000'), entitlements },
    { open: { billing, purchasePolicy }, closed: {} }[store],
  );
  await session.game.checkpoint();
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/collection' });
}

describe('Collector’s pass in the Collection (#158)', () => {
  it('shows The Vault locked with a link to the Store', async () => {
    await open({}, 'open');
    expect(screen.getByText('The Vault')).toBeOnTheScreen();
    expect(screen.getByText(LOCKED)).toBeOnTheScreen();
    expect(screen.getByText(/3 lots every 6 days/)).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: "See the Collector's pass in the Store" }),
    );
    expect(screen).toHavePathname('/store');
    expect(
      await screen.findByRole('button', { name: 'Buy Collector’s Pass for $2.99' }),
    ).toBeEnabled();
  });

  it('shows the locked set without a link when this build has no Store', async () => {
    await open({}, 'closed');
    expect(screen.getByText(LOCKED)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /See the Collector's pass/ })).toBeNull();
  });

  it('offers a fourth lot marked as the pass holder’s and opens The Vault', async () => {
    await open({ collectorsPass: ['purchase-1'] }, 'open');
    expect(screen.getByText(/4 lots every 6 days/)).toBeOnTheScreen();
    expect(screen.getByText(/Curiosities · .* · Collector's pass/)).toBeOnTheScreen();
    expect(screen.queryByText(LOCKED)).toBeNull();
    expect(screen.queryByRole('button', { name: /See the Collector's pass/ })).toBeNull();
  });
});
