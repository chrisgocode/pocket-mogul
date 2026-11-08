import type { TaxState } from '@/domain/tax/types';
import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { taxLiabilityCents } from '@/domain/tax/assessment';

import { engineStep } from './balance/engineStep';
import { taxReturnOwner } from './taxTesting';
import { startTestGameFrom, withoutIncidents } from './testGame';

const content = withoutIncidents(getContent());
const DAY_MS = 600_000;

function activeOwner() {
  return engineStep(
    {
      ...freshGameState({
        saveId: 'tax-parity',
        economyVersion: content.economyVersion,
        wallMs: 0,
      }),
      cashCents: dollars('99750'),
      businesses: [ownedBusiness('vending')],
    },
    { content, command: { type: 'AdvanceTime' } },
  ).state!;
}

describe('eligible tax time', () => {
  it('gives ten hours away exactly the same statements and liability as eight hours live', () => {
    const before = activeOwner();
    const live = engineStep(before, {
      content,
      command: { type: 'AdvanceTime' },
      elapsedMs: 28_800_000,
    }).state!;
    const offline = engineStep(before, {
      content,
      command: { type: 'SettleOffline' },
      wallMs: 36_000_000,
    }).state!;
    expect(offline.cashCents).toBe(live.cashCents);
    expect(offline.businesses).toEqual(live.businesses);
    expect(offline.income).toEqual(live.income);
    expect(taxLiabilityCents(offline.tax)).toBe(taxLiabilityCents(live.tax));
    expect(offline.tax).toMatchObject({
      returns: statements(live.tax),
    });
    expect(offline.clock.simulationMs).toBe(28_800_000);
    const dismissed = engineStep(offline, {
      content,
      command: { type: 'AcknowledgeReturnSummary' },
    }).state!;
    const again = engineStep(dismissed, {
      content,
      command: { type: 'SettleOffline' },
      wallMs: 36_000_000,
    }).state!;
    expect(again.cashCents).toBe(offline.cashCents);
    expect(taxLiabilityCents(again.tax)).toBe(taxLiabilityCents(offline.tax));
  });

  it('restores a pending audit, collects it once and retains the exact unpaid fine', async () => {
    const original = taxReturnOwner('safe');
    const left = await startTestGameFrom({ ...original, cashCents: dollars('500') });
    await left.game.dispatch({
      id: 'zero-before-crash',
      command: { type: 'FileTaxReturn', returnId: 1, method: 'zero', revision: 0 },
    });
    const back = await left.restart({ awayMs: DAY_MS });
    expect(back.game.getSnapshot().state.tax).toMatchObject({
      paidCents: dollars('500'),
      debts: [{ principalCents: dollars('500'), fineCents: dollars('2000') }],
    });
    const again = await back.restart();
    expect(again.game.getSnapshot().state.tax).toEqual(back.game.getSnapshot().state.tax);
  });
});

describe('installments from operating cash', () => {
  it('recovers 25% of Payout while retaining the company Treasury and an earning path', () => {
    const original = taxReturnOwner('safe');
    const base = {
      ...original,
      cashCents: dollars('500'),
      businesses: [ownedBusiness('vending')],
      tax: { ...original.tax, rateBps: 0, basis: { 'business:vending': dollars('250') } },
    };
    const filed = engineStep(base, {
      content,
      command: { type: 'FileTaxReturn', returnId: 1, method: 'zero', revision: 0 },
    }).state!;
    const audited = engineStep(filed, {
      content,
      command: { type: 'AdvanceTime' },
      elapsedMs: DAY_MS,
    }).state!;
    const earned = engineStep(audited, {
      content,
      command: { type: 'AdvanceTime' },
      elapsedMs: DAY_MS,
    }).state!;
    expect(earned.cashCents).toBe(dollars('37.50'));
    expect(earned.businesses[0]?.treasuryCents).toBe(dollars('100'));
    expect(taxLiabilityCents(earned.tax)).toBe(dollars('2437.50'));
  });
});

function statements(tax: TaxState) {
  if (tax.status === 'notStarted') throw new Error('Expected an active ledger');
  return tax.returns;
}
