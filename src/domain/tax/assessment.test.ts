import type { TaxRules } from './types';
import { dollars } from '@/domain/money';

import { startTaxLedger, recordWholeTaxReceipt, closeTaxDay } from './ledger';
import { currentTaxLines, taxRateBps } from './assessment';

describe('wealth-weighted income tax', () => {
  it('protects the first $10K and blends wealth slices without a bracket cliff', () => {
    const rules = taxRules;
    expect(rules).toBeDefined();
    expect(taxRateBps(dollars('10000'), rules)).toBe(0);
    expect(taxRateBps(dollars('100000'), rules)).toBe(450);
    expect(taxRateBps(dollars('1000000'), rules)).toBe(945);
    expect(taxRateBps(dollars('10000000'), rules)).toBe(1444);
  });
});

describe('daily profit reconciliation', () => {
  it('nets costs after receipts exactly like costs before receipts', () => {
    const ledger = startTaxLedger(
      { atMs: 0, wealthCents: dollars('100000'), dayMs: 600000 },
      taxRules,
    );
    const income = {
      source: 'business:bakery',
      grossCents: dollars('1000'),
      profitCents: dollars('1000'),
    };
    const expense = { source: 'business:bakery', grossCents: 0n, profitCents: 0n - dollars('400') };
    const after = recordWholeTaxReceipt(recordWholeTaxReceipt(ledger, income), expense);
    const before = recordWholeTaxReceipt(recordWholeTaxReceipt(ledger, expense), income);
    expect(currentTaxLines(after)).toEqual(currentTaxLines(before));
    expect(currentTaxLines(after)[0]).toMatchObject({
      profitCents: dollars('600'),
      taxCents: dollars('27'),
    });
  });

  it('carries a $200 loss into the next $500 profit without creating a refund', () => {
    const ledger = startTaxLedger(
      { atMs: 0, wealthCents: dollars('100000'), dayMs: 600000 },
      taxRules,
    );
    const loss = recordWholeTaxReceipt(ledger, {
      source: 'business:bakery',
      grossCents: 0n,
      profitCents: 0n - dollars('200'),
    });
    const next = recordWholeTaxReceipt(closeTaxDay(loss), {
      source: 'business:bakery',
      grossCents: dollars('500'),
      profitCents: dollars('500'),
    });
    expect(currentTaxLines(next)[0]).toMatchObject({
      baseCents: dollars('300'),
      taxCents: dollars('13.50'),
    });
  });
});

const taxRules: TaxRules = {
  bands: [
    { upToCents: dollars('10000'), rateBps: 0 },
    { upToCents: dollars('100000'), rateBps: 500 },
    { upToCents: dollars('1000000'), rateBps: 1000 },
    { upToCents: dollars('10000000'), rateBps: 1500 },
  ],
  topRateBps: 2000,
  returnDays: 36,
  auditDelayMs: 600000,
  auditChanceBps: 4000,
  fineMultiplier: 2,
  recoveryBps: 2500,
  historyReturns: 48,
};

describe('fractional tax across days', () => {
  it('collects one cent across 23 one-cent profit days at 4.5%, without rounding each day up', () => {
    const ledger = startTaxLedger(
      { atMs: 0, wealthCents: dollars('100000'), dayMs: 600000 },
      taxRules,
    );
    const settled = Array.from({ length: 23 }).reduce<typeof ledger>(
      (tax) =>
        closeTaxDay(
          recordWholeTaxReceipt(tax, { source: 'capital', grossCents: 1n, profitCents: 1n }),
        ),
      ledger,
    );
    expect(settled.lines.reduce((sum, line) => sum + line.taxCents, 0n)).toBe(1n);
    expect(settled.pools['capital']?.taxRemainder).toBe(350n);
  });
});
