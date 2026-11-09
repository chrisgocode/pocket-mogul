import { scriptedBilling } from './scriptedBilling';
import { startObservedTestGame } from './testGame';

import { ownership, purchasePolicy } from './purchaseTesting';

it('delivers a verified test entitlement durably before finishing the raw transaction', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'delivered' });
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(billing.completions).toEqual([ownership]);
  const reopened = await session.restart();
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
});

it('rolls back the entitlement when its receipt fails and retries verified evidence after restart', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const before = session.game.getSnapshot();
  const document = session.saveDocument();
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'saveFailed' });
  expect(session.game.getSnapshot()).toEqual(before);
  expect(session.saveDocument()).toBe(document);
  expect(billing.completions).toEqual([]);
  const retry = scriptedBilling({
    completionOwner: 'application',
    ownership: [
      {
        status: 'current',
        authority: 'authoritative',
        coverage: 'complete',
        observedAtMs: 1_800_000_000_000,
        ownership: [ownership],
        removals: [],
      },
    ],
  });
  const reopened = await session.restart({ billing: retry });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(retry.completions).toEqual([ownership]);
});

it('returns durable delivery without repeating the effect across duplicates and reset', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [
      { status: 'completed', ownership },
      { status: 'completed', ownership },
      { status: 'completed', ownership },
    ],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.purchase('test-exemption');
  const before = session.game.getSnapshot().state;
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'delivered' });
  expect(session.game.getSnapshot().state).toBe(before);
  await session.game.resetSave('reset-purchases');
  const reopened = await session.restart();
  const reset = reopened.game.getSnapshot().state;
  expect(await reopened.game.purchases.purchase('test-exemption')).toEqual({ status: 'delivered' });
  expect(reopened.game.getSnapshot().state).toBe(reset);
  expect(reset.tax.status).toBe('exempt');
  expect(billing.completions).toEqual([ownership]);
});

it('keeps delivery when completion fails and reconciles an already completed store transaction on reopen', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership }],
    completions: [{ status: 'unavailable' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'delivered' });
  const revision = session.game.getSnapshot().state.revision;
  const retry = scriptedBilling({
    completionOwner: 'application',
    completions: [{ status: 'alreadyCompleted' }],
  });
  const reopened = await session.restart({ billing: retry });
  expect(reopened.game.getSnapshot().state.revision).toBe(revision);
  expect(retry.completions).toEqual([ownership]);
  await reopened.game.purchases.recover();
  expect(retry.completions).toEqual([ownership]);
});

it.each([
  { ...ownership, productClass: 'consumable' },
  { ...ownership, productClass: 'subscription' },
  { ...ownership, reference: { ...ownership.reference, productId: 'unknown' } },
  { ...ownership, reference: { ...ownership.reference, appId: 'wrong.app' } },
  { ...ownership, reference: { ...ownership.reference, environment: 'production' } },
  { ...ownership, completion: { owner: 'application', action: 'consume' } },
] as const)('rejects unauthorized completed evidence %# without finishing it', async (invalid) => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership: invalid }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const before = session.saveDocument();
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'verificationFailed',
  });
  expect(session.saveDocument()).toBe(before);
  expect(billing.completions).toEqual([]);
});

it('keeps authorized transaction namespaces distinct and retains receipts past command pruning', async () => {
  const google = { ...ownership, reference: { ...ownership.reference, store: 'google' } } as const;
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [
      { status: 'completed', ownership },
      { status: 'completed', ownership: google },
      { status: 'completed', ownership },
    ],
  });
  const session = await startObservedTestGame({
    billing,
    purchasePolicy: {
      ...purchasePolicy,
      scopes: [...purchasePolicy.scopes, { ...google.reference }],
    },
  });
  await session.game.dispatch({ id: 'ordinary-receipt', command: { type: 'AdvanceTime' } });
  await session.game.purchases.purchase('test-exemption');
  await session.game.purchases.purchase('test-exemption');
  expect(session.game.getSnapshot().state.tax).toMatchObject({
    status: 'exempt',
    entitlementIds: [
      '["apple","test.app","sandbox","transaction-1"]',
      '["google","test.app","sandbox","transaction-1"]',
    ],
  });
  const reopened = await session.restart({ awayMs: 31 * 86_400_000 });
  expect(reopened.receiptIds()).not.toContain('ordinary-receipt');
  const revision = reopened.game.getSnapshot().state.revision;
  expect(await reopened.game.purchases.purchase('test-exemption')).toEqual({ status: 'delivered' });
  expect(reopened.game.getSnapshot().state.revision).toBe(revision);
  expect(billing.completions).toEqual([ownership, google]);
});

it('reconciles repeated callback evidence without repeating the committed benefit', async () => {
  const current = {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs: 1_800_000_000_000,
    ownership: [ownership],
    removals: [],
  } as const;
  const billing = scriptedBilling({
    completionOwner: 'application',
    ownership: [{ status: 'unavailable' }, current, current],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(billing.completions).toEqual([ownership]);
});

it('rejects application-owned evidence from an adapter with provider-owned completion', async () => {
  const billing = scriptedBilling({ purchases: [{ status: 'completed', ownership }] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'verificationFailed',
  });
  expect(session.game.getSnapshot().state.tax.status).toBe('notStarted');
});

it('publishes durable delivery before store completion and recovers a lost completion marker', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership }],
  });
  const session = await startObservedTestGame({
    billing: {
      ...billing,
      completion: {
        owner: 'application',
        complete: () => {
          expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
          expect(session.saveDocument()).toContain('exempt');
          session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
          return Promise.resolve({ status: 'completed' });
        },
      },
    },
    purchasePolicy,
  });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'delivered' });
  const revision = session.game.getSnapshot().state.revision;
  const retry = scriptedBilling({
    completionOwner: 'application',
    completions: [{ status: 'alreadyCompleted' }],
  });
  const reopened = await session.restart({ billing: retry });
  expect(reopened.game.getSnapshot().state.revision).toBe(revision);
  expect(retry.completions).toEqual([ownership]);
});
