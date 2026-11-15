import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import { revenueCatFake, storeKitFake, storeKitPurchase } from '@/infrastructure/revenueCatTesting';
import { PRODUCT, checkoutGame, checkoutSelection } from './revenueCatCheckoutTesting';
import { startObservedTestGame } from './testGame';

const releaseConfig = {
  profile: 'release',
  store: 'apple',
  appId: 'com.chrisgocode.pocketfortune',
  apiKey: 'appl_release',
} as const;

const purchased = (environment: string) =>
  storeKitFake({ latest: { ...storeKitPurchase, environment } });

describe('Release billing', () => {
  it.each(['production', 'sandbox'])(
    'delivers a %s App Store purchase in its own namespace',
    async (environment) => {
      const { session } = await checkoutGame({
        config: releaseConfig,
        storeKit: purchased(environment),
      });
      expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'delivered' });
      expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
      const [record] = await session.purchaseRecords();
      expect(record?.ownership.reference.environment).toBe(environment);
    },
  );

  it('rejects a local Xcode StoreKit transaction', async () => {
    const { session } = await checkoutGame({ config: releaseConfig, storeKit: purchased('xcode') });
    expect(await session.game.purchases.purchase(PRODUCT)).toEqual({
      status: 'verificationFailed',
    });
    expect(await session.purchaseRecords()).toEqual([]);
  });

  it('opens the storefront for both App Store environments without the validation report', () => {
    const { selected } = checkoutSelection({ config: releaseConfig });
    expect(selected.validation).toBeUndefined();
    expect(selected.purchasePolicy?.scopes.map((scope) => scope.environment)).toEqual([
      'production',
      'sandbox',
    ]);
  });

  it.each([
    { ...releaseConfig, environment: 'production' },
    { ...releaseConfig, checkout: 'sandbox' },
    { ...releaseConfig, productId: 'pm_tax_exemption' },
    { ...releaseConfig, apiKey: 'goog_release' },
    { ...releaseConfig, appId: 'com.other.app' },
  ])('keeps an invalid release configuration disabled %#', async (config) => {
    const loaded: string[] = [];
    const selected = revenueCatBilling({
      config,
      platform: 'ios',
      runtime: revenueCatRuntime(() => {
        loaded.push('loaded');
        return Promise.resolve(revenueCatFake());
      }),
    });
    const session = await startObservedTestGame(selected);
    expect(await session.game.purchases.products()).toEqual({ status: 'disabled', products: [] });
    expect(loaded).toEqual([]);
  });
});
