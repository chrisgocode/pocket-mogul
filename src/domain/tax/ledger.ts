import { moneyCents, type MoneyCents } from '@/domain/money';

import { currentTaxLines, emptyTaxPool, taxRateBps } from './assessment';
import { TAX_BPS, type TaxLedger, type TaxPool, type TaxRules } from './types';

export function startTaxLedger(
  start: { atMs: number; wealthCents: MoneyCents; dayMs: number },
  rules: TaxRules,
): TaxLedger {
  return {
    absence: { status: 'none' },
    status: 'active',
    startedAtMs: start.atMs,
    dayEndsMs: start.atMs + start.dayMs,
    returnEndsMs: start.atMs + start.dayMs * rules.returnDays,
    returnStartedAtMs: start.atMs,
    rateBps: taxRateBps(start.wealthCents, rules),
    openingWealthCents: start.wealthCents,
    pools: {},
    basis: {},
    lines: [],
    returns: [],
    nextReturnId: 1,
    debts: [],
    recoveryRemainder: 0n,
    paidCents: moneyCents(0),
    finesPaidCents: moneyCents(0),
    evadedCents: moneyCents(0),
    grossCents: moneyCents(0),
    costsCents: moneyCents(0),
    assessedCents: moneyCents(0),
    entitlementIds: [],
  };
}

export type TaxReceipt = {
  readonly source: string;
  readonly grossNumerator: bigint;
  readonly profitNumerator: bigint;
  readonly denominator: bigint;
};

function floorDivide(n: bigint, d: bigint): bigint {
  const q = n / d;
  return n % d < 0n ? q - 1n : q;
}

export function recordTaxReceipt(tax: TaxLedger, receipt: TaxReceipt): TaxLedger {
  if (tax.status === 'exempt') return tax;
  const pool = tax.pools[receipt.source] ?? emptyTaxPool();
  const gross = receipt.grossNumerator + pool.grossRemainder;
  const profit = receipt.profitNumerator + pool.ownerRemainder;
  const credited = floorDivide(profit, receipt.denominator);
  return {
    ...tax,
    pools: {
      ...tax.pools,
      [receipt.source]: {
        ...pool,
        grossCents: moneyCents(pool.grossCents + gross / receipt.denominator),
        profitCents: moneyCents(pool.profitCents + credited),
        grossRemainder: gross % receipt.denominator,
        ownerRemainder: profit - credited * receipt.denominator,
      },
    },
  };
}

export function recordWholeTaxReceipt(
  tax: TaxLedger,
  receipt: { source: string; grossCents: bigint; profitCents: bigint },
): TaxLedger {
  if (tax.status === 'exempt') return tax;
  const pool = tax.pools[receipt.source] ?? emptyTaxPool();
  return {
    ...tax,
    pools: {
      ...tax.pools,
      [receipt.source]: {
        ...pool,
        grossCents: moneyCents(pool.grossCents + receipt.grossCents),
        profitCents: moneyCents(pool.profitCents + receipt.profitCents),
      },
    },
  };
}

function nextPool(pool: TaxPool, rateBps: number): TaxPool {
  const base = pool.profitCents > pool.lossCents ? pool.profitCents - pool.lossCents : 0n;
  return {
    ...pool,
    grossCents: moneyCents(0),
    profitCents: moneyCents(0),
    lossCents: moneyCents(
      pool.lossCents > pool.profitCents ? pool.lossCents - pool.profitCents : 0n,
    ),
    taxRemainder: (base * BigInt(rateBps) + pool.taxRemainder) % TAX_BPS,
  };
}

export function closeTaxDay(tax: TaxLedger): TaxLedger {
  if (tax.status === 'exempt') return tax;
  const lines = currentTaxLines(tax).filter(
    (line) => line.grossCents !== 0n || line.profitCents !== 0n,
  );
  return {
    ...tax,
    lines: [...tax.lines, ...lines],
    pools: Object.fromEntries(
      Object.entries(tax.pools).map(([id, pool]) => [id, nextPool(pool, tax.rateBps)]),
    ),
    grossCents: moneyCents(tax.grossCents + lines.reduce((sum, line) => sum + line.grossCents, 0n)),
    costsCents: moneyCents(tax.costsCents + lines.reduce((sum, line) => sum + line.costsCents, 0n)),
    assessedCents: moneyCents(
      tax.assessedCents + lines.reduce((sum, line) => sum + line.taxCents, 0n),
    ),
  };
}

export function closeTaxReturn(
  tax: TaxLedger,
  period: { dayMs: number; rules: TaxRules },
): TaxLedger {
  const amountCents = moneyCents(tax.lines.reduce((sum, line) => sum + line.taxCents, 0n));
  const duration = period.dayMs * period.rules.returnDays;
  const statement = {
    id: tax.nextReturnId,
    fromMs: tax.returnStartedAtMs,
    toMs: tax.returnEndsMs,
    lines: tax.lines,
    amountCents,
    filing: amountCents > 0n ? { status: 'unfiled' as const } : { status: 'cleared' as const },
  };
  const statements = [...tax.returns, statement];
  const oldestKeptId = tax.nextReturnId - period.rules.historyReturns;
  return {
    ...tax,
    lines: [],
    nextReturnId: tax.nextReturnId + 1,
    returnEndsMs: tax.returnEndsMs + duration,
    returnStartedAtMs: tax.returnEndsMs,
    returns: statements.filter(
      (r) =>
        r.id > oldestKeptId ||
        r.filing.status === 'unfiled' ||
        r.filing.status === 'pendingAudit' ||
        tax.debts.some((debt) => debt.returnId === r.id),
    ),
  };
}
