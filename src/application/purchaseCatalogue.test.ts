import { DatabaseSync } from 'node:sqlite';

import { nodeSqliteDriver } from '@/infrastructure/nodeSqliteDriver';
import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import {
  revenueCatFake,
  storeKitFake,
  storeKitPurchase,
  validationConfig,
} from '@/infrastructure/revenueCatTesting';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

import { PURCHASE_CATALOGUE } from './purchaseCatalogue';
import { purchaseKey } from './purchaseLedger';
import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { fakeClock, startObservedTestGame, type TestGame } from './testGame';

const START_MS = 1_800_000_000_000;

const policy = {
  scopes: purchasePolicy.scopes,
  products: [
    ...purchasePolicy.products,
    { productId: 'test-wallet', productClass: 'nonConsumable', entitlements: ['goldenWallet'] },
    {
      productId: 'test-bundle',
      productClass: 'nonConsumable',
      entitlements: ['taxExemption', 'goldenWallet', 'nightManager'],
    },
  ],
} as const;

const bought = (productId: string, purchaseId: string) => ({
  ...ownership,
  reference: { ...ownership.reference, productId, purchaseId },
});

const wallet = bought('test-wallet', 'transaction-wallet');
const bundle = bought('test-bundle', 'transaction-bundle');

const inventory = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: START_MS,
  removals: [],
} as const;

const stateOf = (session: TestGame) => session.game.getSnapshot().state;

describe('a catalogue of permanent products (#151)', () => {
  it('delivers every entitlement a bundle grants in one purchase', async () => {
    const billing = scriptedBilling({
      completionOwner: 'application',
      purchases: [{ status: 'completed', ownership: bundle }],
    });
    const session = await startObservedTestGame({ billing, purchasePolicy: policy });
    expect(await session.game.purchases.purchase('test-bundle')).toEqual({ status: 'delivered' });
    expect(stateOf(session).tax.status).toBe('exempt');
    expect(stateOf(session).entitlements).toEqual({
      goldenWallet: [purchaseKey(bundle.reference)],
      nightManager: [purchaseKey(bundle.reference)],
    });
    expect(await session.purchaseRecords()).toMatchObject([
      { entitlements: ['taxExemption', 'goldenWallet', 'nightManager'] },
    ]);
  });

  it('keeps an entitlement while any product that grants it is still owned', async () => {
    const billing = scriptedBilling({
      completionOwner: 'application',
      restores: [
        { ...inventory, ownership: [wallet, bundle] },
        { ...inventory, ownership: [wallet], removals: [bundle.reference] },
        { ...inventory, ownership: [], removals: [wallet.reference] },
      ],
    });
    const session = await startObservedTestGame({ billing, purchasePolicy: policy });
    await session.game.purchases.restore();
    await session.game.purchases.restore();
    expect(stateOf(session).tax.status).toBe('active');
    expect(stateOf(session).entitlements).toEqual({
      goldenWallet: [purchaseKey(wallet.reference)],
    });
    await session.game.purchases.restore();
    expect(stateOf(session).entitlements).toEqual({});
  });

  it('keeps entitlements through a restart and Reset Save', async () => {
    const billing = scriptedBilling({
      completionOwner: 'application',
      purchases: [{ status: 'completed', ownership: bundle }],
    });
    const session = await startObservedTestGame({ billing, purchasePolicy: policy });
    await session.game.purchases.purchase('test-bundle');
    const held = stateOf(session).entitlements;
    const back = await session.restart({ billing: scriptedBilling() });
    expect(stateOf(back).entitlements).toEqual(held);
    await back.game.resetSave('reset-1');
    expect(stateOf(back).entitlements).toEqual(held);
    expect(stateOf(back).tax.status).toBe('exempt');
  });

  it('reads a receipt saved before the catalogue as the tax exemption', async () => {
    const database = new DatabaseSync(':memory:');
    const store = await openSqlSaveStore(nodeSqliteDriver(database));
    const legacy = {
      ownership,
      benefit: 'taxExemption',
      result: { status: 'delivered' },
      completion: 'completed',
    };
    database
      .prepare('INSERT INTO purchase_receipts (purchase_key, document) VALUES (?, ?)')
      .run(purchaseKey(ownership.reference), JSON.stringify(legacy));
    expect(await store.transact((tx) => tx.readPurchases())).toEqual([
      {
        ownership,
        entitlements: ['taxExemption'],
        result: { status: 'delivered' },
        completion: 'completed',
      },
    ]);
    database.close();
  });
});

const CATALOGUE = [
  ...PURCHASE_CATALOGUE,
  { productId: 'pm_golden_wallet', entitlements: ['goldenWallet'] },
] as const;

const storeKitWallet = {
  ...storeKitPurchase,
  originalId: '2000000987654321',
  productId: 'pm_golden_wallet',
};

function appleGame(storeKit: ReturnType<typeof storeKitFake>, config: object = validationConfig) {
  const clock = fakeClock(START_MS);
  return startObservedTestGame({
    ...revenueCatBilling({
      config: { ...config, checkout: 'sandbox' },
      platform: 'ios',
      runtime: revenueCatRuntime(() => Promise.resolve(revenueCatFake())),
      storeKit: { evidence: () => Promise.resolve(storeKit), clock },
      catalogue: CATALOGUE,
    }),
    clock,
  });
}

describe('the App Store adapter with several products (#151)', () => {
  it('needs no product named in its configuration', async () => {
    const { productId: _product, entitlementId: _entitlement, ...config } = validationConfig;
    const session = await appleGame(storeKitFake(), config);
    expect(session.game.storefront.status).toBe('open');
    expect(session.game.storefront.catalogue).toHaveLength(CATALOGUE.length);
  });

  it('restores each owned product and sees a refund of any of them', async () => {
    const storeKit = storeKitFake({ entitlements: [storeKitPurchase, storeKitWallet] });
    const session = await appleGame(storeKit);
    await session.game.purchases.restore();
    expect(stateOf(session)).toMatchObject({
      tax: { status: 'exempt' },
      entitlements: { goldenWallet: [expect.any(String)] },
    });
    storeKit.changeWithoutUpdate({
      entitlements: [storeKitPurchase],
      latest: { ...storeKitWallet, revocationDateMs: START_MS },
    });
    await session.game.purchases.restore();
    expect(stateOf(session)).toMatchObject({ tax: { status: 'exempt' }, entitlements: {} });
  });

  it('checks out the product that was asked for and refuses one outside the catalogue', async () => {
    const storeKit = storeKitFake({ latest: storeKitWallet });
    const session = await appleGame(storeKit);
    expect(await session.game.purchases.purchase('pm_golden_wallet')).toEqual({
      status: 'delivered',
    });
    expect(stateOf(session).tax.status).not.toBe('exempt');
    expect(await session.game.purchases.purchase('pm_unknown')).toEqual({ status: 'disabled' });
  });
});
