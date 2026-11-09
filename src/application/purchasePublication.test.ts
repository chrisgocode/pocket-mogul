import { purchaseKey } from './purchaseLedger';
import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { startObservedTestGame } from './testGame';

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;

it('keeps the closed snapshot when removal committed before its storage response arrives', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [
      current,
      {
        ...current,
        ownership: [],
        removals: [ownership.reference],
      },
    ],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  const before = session.game.getSnapshot();
  const held = session.holdSaveResponses(/INSERT INTO save_state/);
  const removing = session.game.purchases.restore();
  await held.committed;
  session.game.purchases.dispose();
  held.release();
  await removing;
  expect(session.game.getSnapshot()).toBe(before);
  const reopened = await session.restart({ billing: scriptedBilling() });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('active');
  expect(await reopened.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'removed' } },
  ]);
});

it.each([/INSERT INTO save_state/, /FROM save_backups/])(
  'keeps a closed snapshot when direct delivery is awaiting %s',
  async (matching) => {
    const billing = scriptedBilling({
      completionOwner: 'application',
      purchases: [{ status: 'completed', ownership }],
    });
    const session = await startObservedTestGame({ billing, purchasePolicy });
    const before = session.game.getSnapshot();
    const held = session.holdSaveResponses(matching);
    const purchasing = session.game.purchases.purchase('test-exemption');
    await held.committed;
    session.game.purchases.dispose();
    held.release();
    expect(await purchasing).toEqual({ status: 'unavailable' });
    expect(session.game.getSnapshot()).toBe(before);
    expect(billing.completions).toEqual([]);
    const reopened = await session.restart({
      billing: scriptedBilling({ completionOwner: 'application' }),
    });
    expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
    expect(await reopened.purchaseRecords()).toHaveLength(1);
  },
);

it('keeps a closed snapshot when cached restoration committed before its storage response arrives', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current] });
  const session = await startObservedTestGame({
    billing,
    purchasePolicy,
    taxEntitlement: {
      current: () =>
        Promise.resolve({ status: 'revoked', transactionId: purchaseKey(ownership.reference) }),
    },
  });
  await session.game.purchases.restore();
  await session.game.restoreTaxExemption();
  const before = session.game.getSnapshot();
  const held = session.holdSaveResponses(/INSERT INTO save_state/);
  const recovering = session.game.purchases.recover();
  await held.committed;
  session.game.purchases.dispose();
  held.release();
  await recovering;
  expect(session.game.getSnapshot()).toBe(before);
  const reopened = await session.restart({
    billing: scriptedBilling(),
    taxEntitlement: { current: () => Promise.resolve({ status: 'unavailable' }) },
  });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
});
