import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { holdsEntitlement, type Entitlements } from '@/domain/entitlements';
import { freshGameState, type GameState } from '@/domain/gameState';
import { withRichList } from '@/domain/richList';

import { richListRules } from './economy';
import { PURCHASE_CATALOGUE } from './purchaseCatalogue';
import { purchaseKey } from './purchaseLedger';
import { ownership, purchasePolicy } from './purchaseTesting';
import { selectRichList } from './richListView';
import { scriptedBilling } from './scriptedBilling';
import { BUNDLE_PARTS } from './storeBundleView';
import { selectStore, type StoreRow } from './storeView';
import { applyTaxEntitlement } from './taxEntitlement';
import { startObservedTestGame } from './testGame';

const content = getContent();
const PART_IDS = BUNDLE_PARTS['pm_mogul_bundle'] ?? [];

const FRESH = freshGameState({
  saveId: 'mogul-bundle',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

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
];

const front = {
  shelf: { status: 'listed', products },
  activity: { status: 'idle' },
  notice: { about: 'nothing' },
} as const;

const exempt = (state: GameState): GameState =>
  applyTaxEntitlement(state, {
    content,
    entitlement: { status: 'verified', transactionId: 'purchase-tax' },
  });

const bundleRow = (state: GameState): StoreRow | undefined =>
  selectStore(state, { catalogue: PURCHASE_CATALOGUE, front }).find(
    (row) => row.productId === 'pm_mogul_bundle',
  );

const owning = (entitlements: Entitlements): GameState => ({ ...FRESH, entitlements });

const bundleOwnership = {
  ...ownership,
  reference: { ...ownership.reference, productId: 'pm_mogul_bundle', purchaseId: 'bundle-1' },
};

const policy = {
  scopes: purchasePolicy.scopes,
  products: PURCHASE_CATALOGUE.map((product) => ({
    ...product,
    productClass: 'nonConsumable' as const,
  })),
};

describe('Mogul bundle (#154)', () => {
  it('grants what its four parts grant, and neither the badge nor the Collector’s pass', () => {
    const bundle = PURCHASE_CATALOGUE.find((product) => product.productId === 'pm_mogul_bundle');
    const parts = PURCHASE_CATALOGUE.filter((product) => PART_IDS.includes(product.productId));
    expect(parts).toHaveLength(4);
    expect(new Set(bundle?.entitlements)).toEqual(
      new Set(parts.flatMap((part) => part.entitlements)),
    );
    expect(bundle?.entitlements).not.toContain('founder');
    expect(bundle?.entitlements).not.toContain('collectorsPass');
  });

  it('delivers every part in one purchase', async () => {
    const billing = scriptedBilling({
      completionOwner: 'application',
      purchases: [{ status: 'completed', ownership: bundleOwnership }],
    });
    const session = await startObservedTestGame({ billing, purchasePolicy: policy });
    expect(await session.game.purchases.purchase('pm_mogul_bundle')).toEqual({
      status: 'delivered',
    });
    const { state } = session.game.getSnapshot();
    const key = purchaseKey(bundleOwnership.reference);
    expect(state.tax.status).toBe('exempt');
    expect(state.entitlements).toEqual({
      vipPass: [key],
      removeAds: [key],
      goldenWallet: [key],
      nightManager: [key],
    });
    expect(holdsEntitlement(state, 'founder')).toBe(false);
  });

  it('shows the saving against the four separate prices', () => {
    expect(bundleRow(FRESH)).toMatchObject({
      name: 'Mogul Bundle',
      saving: 'Save 28% against buying each part on its own.',
      finePrint: "Founder's badge and Collector's pass are not included.",
      offer: { status: 'forSale', price: '$9.99' },
    });
  });

  it('says before checkout that parts already owned earn no discount', () => {
    expect(bundleRow(owning({ goldenWallet: ['purchase-1'] }))).toMatchObject({
      saving: "Save 9% against buying the parts you don't own yet.",
      finePrint:
        'You already own Golden Wallet. The bundle costs the same: the store gives no discount for parts you own.',
    });
    const mostlyOwned = owning({
      vipPass: ['purchase-1'],
      removeAds: ['purchase-1'],
      goldenWallet: ['purchase-2'],
    });
    expect(bundleRow(mostlyOwned)).toMatchObject({
      saving: "The parts you don't own yet cost less bought on their own.",
      finePrint:
        'You already own VIP Pass and Golden Wallet. The bundle costs the same: the store gives no discount for parts you own.',
    });
  });

  it('is owned once every part is owned, however each was bought', () => {
    const everyPart = exempt(
      owning({
        vipPass: ['purchase-1'],
        removeAds: ['purchase-1'],
        goldenWallet: ['purchase-2'],
        nightManager: ['purchase-3'],
      }),
    );
    expect(bundleRow(everyPart)).toMatchObject({ offer: { status: 'owned' }, saving: undefined });
  });

  it('shows no saving when the store returned no comparable prices', () => {
    const unpriced = products.map(({ price: _price, ...product }) => product);
    const rows = selectStore(FRESH, {
      catalogue: PURCHASE_CATALOGUE,
      front: { ...front, shelf: { status: 'listed', products: unpriced } },
    });
    expect(rows[0]).toMatchObject({ productId: 'pm_mogul_bundle', saving: undefined });
  });
});

describe('Founder’s badge (#154)', () => {
  const ranked = withRichList(FRESH, richListRules(content)).state;
  const player = (state: GameState) => {
    const view = selectRichList(state, content);
    return view.status === 'shown' ? view.rows.find((row) => row.who === 'player') : undefined;
  };

  it('is sold on its own and changes no money', () => {
    expect(PURCHASE_CATALOGUE).toContainEqual({
      productId: 'pm_founder',
      entitlements: ['founder'],
    });
  });

  it('writes the player’s name in gold on the Rich List', () => {
    expect(player(ranked)).toMatchObject({ nameTone: 'plain', sector: 'Peak net worth' });
    expect(player({ ...ranked, entitlements: { founder: ['purchase-1'] } })).toMatchObject({
      name: 'You',
      nameTone: 'gold',
      sector: 'Founder · Peak net worth',
    });
  });
});
