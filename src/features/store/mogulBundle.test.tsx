import { CURRENT_ECONOMY_VERSION } from '@/content';
import { renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { PURCHASE_CATALOGUE } from '@/application/purchaseCatalogue';
import { purchasePolicy as testPolicy } from '@/application/purchaseTesting';
import { scriptedBilling } from '@/application/scriptedBilling';
import { startTestGameFrom } from '@/application/testGame';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const FRESH = freshGameState({
  saveId: 'mogul-bundle-screen',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

const purchasePolicy = {
  scopes: testPolicy.scopes,
  products: PURCHASE_CATALOGUE.map(({ productId, entitlements }) => ({
    productId,
    entitlements,
    productClass: 'nonConsumable' as const,
  })),
};

const products = [
  { productId: 'pm_mogul_bundle', displayName: 'Mogul Bundle', displayPrice: '$9.99', price: 9.99 },
  {
    productId: 'pm_tax_exemption',
    displayName: 'Tax Exemption',
    displayPrice: '$1.99',
    price: 1.99,
  },
  { productId: 'pm_vip_pass', displayName: 'VIP Pass', displayPrice: '$5.99', price: 5.99 },
  {
    productId: 'pm_golden_wallet',
    displayName: 'Golden Wallet',
    displayPrice: '$2.99',
    price: 2.99,
  },
  {
    productId: 'pm_night_manager',
    displayName: 'Night Manager',
    displayPrice: '$2.99',
    price: 2.99,
  },
  { productId: 'pm_founder', displayName: 'Founder’s Badge', displayPrice: '$4.99', price: 4.99 },
];

async function open(url: string, overrides: Partial<GameState> = {}): Promise<void> {
  const billing = scriptedBilling({ completionOwner: 'application', products });
  const session = await startTestGameFrom({ ...FRESH, ...overrides }, { billing, purchasePolicy });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: url });
}

const founder = { entitlements: { founder: ['purchase-1'] } };

describe('Mogul bundle in the Store (#154)', () => {
  it('shows the saving and sells the bundle at the store price', async () => {
    await open('/store');
    expect(await screen.findByRole('button', { name: 'Buy Mogul Bundle for $9.99' })).toBeEnabled();
    expect(screen.getByText('Save 28% against buying each part on its own.')).toBeOnTheScreen();
  });

  it('warns a player who owns a part that the bundle price does not drop', async () => {
    await open('/store', { entitlements: { goldenWallet: ['purchase-1'] } });
    expect(
      await screen.findByText(
        'You already own Golden Wallet. The bundle costs the same: the store gives no discount for parts you own.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Golden Wallet owned')).toBeOnTheScreen();
  });
});

describe('Founder’s badge (#154)', () => {
  it('shows no title on Profile without it', async () => {
    await open('/portfolio');
    expect(screen.queryByLabelText('Title, Founder')).toBeNull();
  });

  it('shows the Founder title on Profile', async () => {
    await open('/portfolio', founder);
    expect(screen.getByLabelText('Title, Founder')).toBeOnTheScreen();
  });

  it('names the player a Founder on the Rich List', async () => {
    await open('/rich-list', {
      ...founder,
      cashCents: dollars('6,000'),
      peakNetWorthCents: dollars('6,000'),
      richList: {
        status: 'active',
        day: 0,
        fortunes: {},
        passed: 2,
        mostPassed: 2,
        news: { status: 'none' },
      },
    });
    expect(
      screen.getByLabelText('Number 19, You, Founder · Peak net worth, $6.00K'),
    ).toBeOnTheScreen();
  });
});
