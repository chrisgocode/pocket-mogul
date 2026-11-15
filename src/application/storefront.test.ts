import type { PurchaseResult } from './billingPort';
import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { selectStore, storeNotice } from './storeView';
import { startObservedTestGame, startTestGame, type TestGame } from './testGame';

const products = [
  { productId: 'test-exemption', displayName: 'Exonération', displayPrice: '1,99 €' },
];

const restored = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;

async function openStore(script: Parameters<typeof scriptedBilling>[0] = {}) {
  const billing = scriptedBilling({ completionOwner: 'application', products, ...script });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const stocked = new Promise<void>((resolve) => {
    session.game.storefront.subscribe(resolve);
  });
  await stocked;
  return session;
}

const rows = ({ game }: TestGame) =>
  selectStore(game.getSnapshot().state, {
    catalogue: game.storefront.catalogue,
    front: game.storefront.getSnapshot(),
  });

const notice = ({ game }: TestGame, about: 'checkout' | 'restore') =>
  storeNotice(game.storefront.getSnapshot(), about);

describe('the Store (#151)', () => {
  it('is closed, with nothing to buy, in a build without a catalogue', async () => {
    const session = await startTestGame();
    expect(session.game.storefront).toMatchObject({ status: 'closed', catalogue: [] });
    expect(rows(session)).toEqual([]);
  });

  it('lists each product with the name and price the store returns', async () => {
    const session = await openStore();
    expect(rows(session)).toMatchObject([
      {
        productId: 'test-exemption',
        name: 'Exonération',
        offer: { status: 'forSale', price: '1,99 €' },
      },
    ]);
  });

  it('marks a product owned once the purchase is delivered', async () => {
    const session = await openStore({ purchases: [{ status: 'completed', ownership }] });
    await session.game.storefront.buy('test-exemption');
    expect(rows(session)).toMatchObject([{ offer: { status: 'owned' } }]);
    expect(notice(session, 'checkout')).toBe('Purchased. Thank you!');
    expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  });

  it.each<[PurchaseResult, string | undefined]>([
    [{ status: 'cancelled' }, undefined],
    [{ status: 'declined' }, 'The payment was declined. You were not charged.'],
    [
      { status: 'pending', productId: 'test-exemption' },
      'Waiting for approval. It arrives as soon as the purchase is approved.',
    ],
    [{ status: 'unavailable' }, "The store can't be reached right now. Try again later."],
  ])('explains a checkout that ends %j and leaves the product for sale', async (result, text) => {
    const session = await openStore({ purchases: [result] });
    await session.game.storefront.buy('test-exemption');
    expect(notice(session, 'checkout')).toBe(text);
    expect(rows(session)).toMatchObject([{ offer: { status: 'forSale' } }]);
  });

  it('restores a purchase and says when there is none', async () => {
    const session = await openStore({ restores: [{ ...restored, ownership: [] }, restored] });
    await session.game.storefront.restore();
    expect(notice(session, 'restore')).toBe('No purchases found for this store account.');
    await session.game.storefront.restore();
    expect(notice(session, 'restore')).toBe('Purchases restored.');
    expect(notice(session, 'checkout')).toBeUndefined();
    expect(rows(session)).toMatchObject([{ offer: { status: 'owned' } }]);
  });

  it('still shows an owned product when the store cannot be reached', async () => {
    const session = await openStore({ restores: [restored], products: [] });
    await session.game.storefront.restore();
    expect(rows(session)).toMatchObject([{ name: 'test-exemption', offer: { status: 'owned' } }]);
  });
});
