import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import { revenueCatFake, validationConfig } from '@/infrastructure/revenueCatTesting';
import { scriptedBilling } from './scriptedBilling';
import { ownership } from './purchaseTesting';
import { startObservedTestGame } from './testGame';

it.each([
  { requestDate: '2027-01-15T08:00:00Z', entitlements: { verification: 'VERIFIED' } },
  { requestDate: '2000-01-01T00:00:00Z', entitlements: { verification: 'NOT_REQUESTED' } },
  { requestDate: 'invalid', entitlements: { verification: 'VERIFIED' } },
  { requestDate: '2027-01-15T08:00:00Z', entitlements: { verification: 'FAILED' } },
])(
  'preserves committed access through Reset Save with insufficient SDK evidence %#',
  async (info) => {
    const sdk = revenueCatFake();
    const selected = revenueCatBilling({
      config: validationConfig,
      platform: 'ios',
      runtime: revenueCatRuntime(() =>
        Promise.resolve({ ...sdk, getCustomerInfo: () => Promise.resolve(info) }),
      ),
    });
    const managed = {
      ...ownership,
      reference: {
        ...ownership.reference,
        appId: validationConfig.appId,
        productId: validationConfig.productId,
      },
      completion: { owner: 'provider' },
      verification: { ...ownership.verification, source: 'provider' },
    } as const;
    const session = await startObservedTestGame({
      ...selected,
      billing: scriptedBilling({
        purchases: [{ status: 'completed', ownership: managed }],
      }),
    });
    expect(await session.game.purchases.purchase(validationConfig.productId)).toEqual({
      status: 'delivered',
    });
    const reopened = await session.restart(selected);
    expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
    expect(await reopened.purchaseRecords()).toHaveLength(1);
    await reopened.game.purchases.restore();
    expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
    const identity = await reopened.purchaseIdentity();
    await reopened.game.resetSave('reset-validation');
    expect(await reopened.purchaseIdentity()).toEqual(identity);
    expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
    expect(sdk.configurations).toEqual(['appl_validation']);
  },
);

it('does not infer pending-payment absence from empty CustomerInfo', async () => {
  const sdk = revenueCatFake();
  const selected = revenueCatBilling({
    config: validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
  });
  const session = await startObservedTestGame({
    ...selected,
    billing: scriptedBilling({
      purchases: [{ status: 'pending', productId: validationConfig.productId }],
    }),
  });
  await session.game.purchases.purchase(validationConfig.productId);
  const reopened = await session.restart(selected);
  await reopened.game.purchases.restore();
  expect(await reopened.game.purchases.purchase(validationConfig.productId)).toEqual({
    status: 'unavailable',
  });
  expect(await reopened.purchaseIdentity()).toHaveProperty('checkout', {
    status: 'pending',
    productId: validationConfig.productId,
  });
  expect(await reopened.purchaseRecords()).toEqual([]);
});
