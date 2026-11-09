import { getContent } from '@/content';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { taxLiabilityCents } from '@/domain/tax/assessment';
import { taxReturnOwner } from './taxTesting';
import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { startObservedTestGame, startTestGameFrom, withoutIncidents } from './testGame';

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;

it('restores verified ownership once without restoring or changing progress', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [current, current],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  session.game.tap();
  await session.game.flushTaps();
  expect(await session.game.purchases.restore()).toEqual(current);
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  const state = session.game.getSnapshot().state;
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state).toBe(state);
  expect(state.cashCents).toBe(100n);
  expect(billing.completions).toEqual([ownership]);
});

it('retains purchase identity and provider reference across reset and offline restart', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    initialize: { status: 'ready', providerReference: 'test-customer' },
    restores: [current],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  const identity = await session.purchaseIdentity();
  expect(identity).toMatchObject({ providerReference: 'test-customer' });
  session.game.tap();
  await session.game.flushTaps();
  await session.game.resetSave('reset-owned');
  const reopened = await session.restart({ billing: scriptedBilling() });
  expect(await reopened.purchaseIdentity()).toEqual(identity);
  expect(reopened.game.getSnapshot().state.cashCents).toBe(0n);
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toHaveLength(1);
});

it('reconstructs cached permanent access before offline settlement without a catalogue', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  session.deleteSaveDocument();
  const reopened = await session.restart({
    billing: scriptedBilling(),
    purchasePolicy: { scopes: purchasePolicy.scopes, products: [] },
    awayMs: 36_000_000,
  });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(reopened.game.getSnapshot().state.cashCents).toBe(0n);
  expect(await reopened.purchaseRecords()).toHaveLength(1);
});

it.each([
  { ...current, authority: 'cached' },
  { ...current, coverage: 'incomplete' },
  { ...current, observedAtMs: 1 },
  { status: 'unavailable' },
] as const)('does not manufacture ownership from unusable inventory %#', async (evidence) => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [evidence] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect(await session.purchaseRecords()).toEqual([]);
});

it.each([
  { ...current, authority: 'cached', ownership: [] },
  { ...current, coverage: 'incomplete', ownership: [] },
  { ...current, observedAtMs: 1, ownership: [] },
  { ...current, ownership: [], removals: [ownership.reference] },
  { status: 'unavailable' },
] as const)(
  'keeps cached permanent access when reconciliation cannot establish removal %#',
  async (evidence) => {
    const billing = scriptedBilling({ completionOwner: 'application', restores: [current] });
    const session = await startObservedTestGame({ billing, purchasePolicy });
    await session.game.purchases.restore();
    const reopened = await session.restart({
      billing: scriptedBilling({ ownership: [evidence], restores: [evidence] }),
    });
    const state = reopened.game.getSnapshot().state;
    await reopened.game.purchases.restore();
    expect(reopened.game.getSnapshot().state).toBe(state);
    expect(state.tax.status).toBe('exempt');
    expect(await reopened.purchaseRecords()).toHaveLength(1);
  },
);

it('restores before one offline settlement and preserves waived history and the Return summary', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current] });
  const session = await startTestGameFrom(
    {
      ...taxReturnOwner(),
      tax: { ...taxReturnOwner().tax, basis: { 'business:vending': dollars('150') } },
      cashCents: dollars('100000'),
      businesses: [ownedBusiness('vending')],
    },
    { billing, purchasePolicy, content: withoutIncidents(getContent()) },
  );
  await session.game.purchases.restore();
  const back = await session.restart({ awayMs: 36_000_000, billing: scriptedBilling() });
  const state = back.game.getSnapshot().state;
  expect(state.tax).toMatchObject({
    status: 'exempt',
    returns: [{ filing: { status: 'waived' } }],
  });
  expect(taxLiabilityCents(state.tax)).toBe(0n);
  expect(state.income.businessEarningsCents).toBe(dollars('2400'));
  expect(state.returnSummary).toMatchObject({
    status: 'pending',
    summary: { creditedMs: 28_800_000, earnings: { businesses: dollars('2400') } },
  });
  const reopened = await back.restart();
  expect(reopened.game.getSnapshot().state.income).toEqual(state.income);
  expect(reopened.game.getSnapshot().state.returnSummary).toEqual(state.returnSummary);
});

it('reports failed restore delivery without publishing partial ownership and retries on reopen', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const before = session.game.getSnapshot().state;
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.restore()).toEqual({ status: 'saveFailed' });
  expect(session.game.getSnapshot().state).toBe(before);
  expect(await session.purchaseRecords()).toEqual([]);
  const back = await session.restart({
    billing: scriptedBilling({ completionOwner: 'application', ownership: [current] }),
  });
  expect(back.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await back.purchaseRecords()).toHaveLength(1);
});

it.each([
  { scopes: [{ store: 'apple', appId: 'test.app', environment: 'production' }] },
  { scopes: [{ store: 'google', appId: 'test.app', environment: 'sandbox' }] },
  { scopes: [{ store: 'apple', appId: 'another.app', environment: 'sandbox' }] },
  { scopes: [] },
] as const)(
  'does not project cached ownership outside authorized namespaces %#',
  async ({ scopes }) => {
    const billing = scriptedBilling({ completionOwner: 'application', restores: [current] });
    const session = await startObservedTestGame({ billing, purchasePolicy });
    await session.game.purchases.restore();
    session.deleteSaveDocument();
    const reopened = await session.restart({
      billing: scriptedBilling(),
      purchasePolicy: { scopes, products: [] },
    });
    expect(reopened.game.getSnapshot().state.tax.status).toBe('notStarted');
    expect(await reopened.purchaseRecords()).toHaveLength(1);
  },
);
