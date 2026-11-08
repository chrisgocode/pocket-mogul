import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { taxLiabilityCents } from '@/domain/tax/assessment';
import type { VerifiedTaxEntitlement } from '@/domain/tax/exemption';

import { taxReturnOwner } from './taxTesting';
import { startTestGameFrom } from './testGame';

const verified = {
  current: () => Promise.resolve({ status: 'verified', transactionId: 'store:one' } as const),
};

describe('verified permanent tax exemption', () => {
  it('waives outstanding returns, restores idempotently and survives resetting the game', async () => {
    const session = await startTestGameFrom(taxReturnOwner(), { taxEntitlement: verified });
    expect(session.game.getSnapshot().state.tax).toMatchObject({
      status: 'exempt',
      returns: [{ filing: { status: 'waived' } }],
      debts: [],
    });
    await session.game.restoreTaxExemption();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('2000'));
    await session.game.resetSave('reset-exempt');
    expect(session.game.getSnapshot().state.tax).toMatchObject({
      status: 'exempt',
      entitlementIds: ['store:one'],
    });
    const restored = await session.restart({
      taxEntitlement: { current: () => Promise.resolve({ status: 'unavailable' } as const) },
    });
    expect(restored.game.getSnapshot().state.tax.status).toBe('exempt');
  });

  it('ends refunded exemption prospectively without back-taxing the cached offline interval', async () => {
    const session = await startTestGameFrom(
      {
        ...taxReturnOwner(),
        tax: { ...taxReturnOwner().tax, basis: { 'business:vending': dollars('150') } },
        cashCents: dollars('100000'),
        businesses: [ownedBusiness('vending')],
      },
      { taxEntitlement: verified },
    );
    const refunded = await session.restart({
      awayMs: 36_000_000,
      taxEntitlement: {
        current: () => Promise.resolve({ status: 'revoked', transactionId: 'store:one' } as const),
      },
    });
    const state = refunded.game.getSnapshot().state;
    expect(state.tax.status).toBe('active');
    expect(state.income.businessEarningsCents).toBe(dollars('2400'));
    expect(taxLiabilityCents(state.tax)).toBe(0n);
    expect(state.tax).toMatchObject({ returns: [{ filing: { status: 'waived' } }] });
  });

  it('does not grant an unavailable purchase and rolls back a failed activation save', async () => {
    let entitlement: VerifiedTaxEntitlement = { status: 'unavailable' };
    const session = await startTestGameFrom(taxReturnOwner(), {
      taxEntitlement: { current: () => Promise.resolve(entitlement) },
    });
    expect(taxLiabilityCents(session.game.getSnapshot().state.tax)).toBe(dollars('1000'));
    entitlement = { status: 'verified', transactionId: 'store:one' };
    session.faults.failWrites = true;
    expect(await session.game.restoreTaxExemption()).toEqual({ ok: false, error: 'SAVE_FAILED' });
    expect(session.game.getSnapshot().state.tax.status).toBe('active');
    session.faults.failWrites = false;
    expect((await session.game.restoreTaxExemption()).ok).toBe(true);
    expect(taxLiabilityCents(session.game.getSnapshot().state.tax)).toBe(0n);
  });
});
