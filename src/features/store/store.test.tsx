import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { ownership } from '@/application/purchaseTesting';
import { scriptedBilling } from '@/application/scriptedBilling';
import { startObservedTestGame, startTestGame, type TestGame } from '@/application/testGame';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const purchasePolicy = {
  scopes: [{ store: 'apple', appId: 'test.app', environment: 'sandbox' }],
  products: [
    {
      productId: 'pm_tax_exemption',
      productClass: 'nonConsumable',
      entitlements: ['taxExemption'],
    },
  ],
} as const;

const bought = {
  ...ownership,
  reference: { ...ownership.reference, productId: 'pm_tax_exemption' },
};

const restored = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [bought],
  removals: [],
} as const;

const products = [
  { productId: 'pm_tax_exemption', displayName: 'Tax Exemption', displayPrice: '$1.99' },
];

async function openWithStore(
  url: string,
  script: Parameters<typeof scriptedBilling>[0] = {},
): Promise<TestGame> {
  const billing = scriptedBilling({ completionOwner: 'application', products, ...script });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: url });
  return session;
}

const buyButton = () => screen.findByRole('button', { name: 'Buy Tax Exemption for $1.99' });

describe('Store (#151)', () => {
  it('opens from Profile and sells the tax exemption at the store price', async () => {
    const session = await openWithStore('/portfolio', {
      purchases: [{ status: 'completed', ownership: bought }],
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Store' }));
    expect(screen).toHavePathname('/store');
    await fireEvent.press(await buyButton());
    expect(await screen.findByLabelText('Tax Exemption owned')).toBeOnTheScreen();
    expect(screen.getByText('Purchased. Thank you!')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Buy Tax Exemption for $1.99' })).toBeNull();
    expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  });

  it('keeps the product for sale and says why when the payment is declined', async () => {
    await openWithStore('/store', { purchases: [{ status: 'declined' }] });
    await fireEvent.press(await buyButton());
    expect(
      await screen.findByText('The payment was declined. You were not charged.'),
    ).toBeOnTheScreen();
    expect(await buyButton()).toBeEnabled();
  });

  it('says so when the store cannot be reached', async () => {
    await openWithStore('/store', { products: [] });
    expect(await screen.findByText('Store unavailable')).toBeOnTheScreen();
  });

  it('leads from Taxes to the Store until the exemption is owned', async () => {
    await openWithStore('/taxes');
    await fireEvent.press(screen.getByRole('button', { name: 'See it in the Store' }));
    expect(screen).toHavePathname('/store');
  });

  it('restores purchases from Settings', async () => {
    const session = await openWithStore('/settings', { restores: [restored] });
    await fireEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
    expect(await screen.findByText('Purchases restored.')).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  });

  it('shows no Store, offer or Restore button in a build without a catalogue', async () => {
    const session = await startTestGame();
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/portfolio' });
    expect(screen.queryByRole('button', { name: 'Store' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Taxes' }));
    expect(screen.queryByRole('button', { name: 'See it in the Store' })).toBeNull();
  });

  it('has no Restore button in Settings without a catalogue', async () => {
    const session = await startTestGame();
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/settings' });
    expect(screen.getByRole('button', { name: 'Reset save' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Restore purchases' })).toBeNull();
  });
});
