import type { MoneyCents } from '@/domain/money';

export const TAX_READER_VERSION = 4;
export const TAX_BPS = 10_000n;
export const TAX_SHARES = 1_000_000_000_000n;

export type TaxRules = {
  readonly bands: readonly { readonly upToCents: MoneyCents; readonly rateBps: number }[];
  readonly topRateBps: number;
  readonly returnDays: number;
  readonly auditDelayMs: number;
  readonly auditChanceBps: number;
  readonly fineMultiplier: number;
  readonly recoveryBps: number;
  readonly historyReturns: number;
};

export type TaxLine = {
  readonly source: string;
  readonly atMs: number;
  readonly rateBps: number;
  readonly grossCents: MoneyCents;
  readonly costsCents: MoneyCents;
  readonly profitCents: MoneyCents;
  readonly lossOffsetCents: MoneyCents;
  readonly baseCents: MoneyCents;
  readonly taxCents: MoneyCents;
};

export type TaxPool = {
  readonly grossCents: MoneyCents;
  readonly profitCents: MoneyCents;
  readonly lossCents: MoneyCents;
  readonly taxRemainder: bigint;
  readonly ownerRemainder: bigint;
  readonly grossRemainder: bigint;
};

export type TaxFiling =
  | { readonly status: 'unfiled' }
  | { readonly status: 'honest' }
  | {
      readonly status: 'pendingAudit';
      readonly dueAtMs: number;
      readonly outcome: 'audit' | 'clear';
      readonly fineCents: MoneyCents;
    }
  | { readonly status: 'audited' }
  | { readonly status: 'cleared' }
  | { readonly status: 'waived' };

export type TaxReturn = {
  readonly id: number;
  readonly fromMs: number;
  readonly toMs: number;
  readonly lines: readonly TaxLine[];
  readonly amountCents: MoneyCents;
  readonly filing: TaxFiling;
};

export type TaxDebt = {
  readonly returnId: number;
  readonly principalCents: MoneyCents;
  readonly fineCents: MoneyCents;
};

export type TaxAbsence = {
  readonly grossCents: MoneyCents;
  readonly costsCents: MoneyCents;
  readonly estimatedCents: MoneyCents;
  readonly collectedCents: MoneyCents;
  readonly cashCents: MoneyCents;
  readonly treasuryCents: MoneyCents;
};

export type TaxLedger = {
  readonly absence:
    | { readonly status: 'none' }
    | { readonly status: 'pending'; readonly summary: TaxAbsence };
  readonly status: 'active' | 'exempt';
  readonly startedAtMs: number;
  readonly dayEndsMs: number;
  readonly returnEndsMs: number;
  readonly returnStartedAtMs: number;
  readonly rateBps: number;
  readonly openingWealthCents: MoneyCents;
  readonly pools: Readonly<Record<string, TaxPool>>;
  readonly basis: Readonly<Record<string, MoneyCents>>;
  readonly lines: readonly TaxLine[];
  readonly returns: readonly TaxReturn[];
  readonly nextReturnId: number;
  readonly debts: readonly TaxDebt[];
  readonly recoveryRemainder: bigint;
  readonly paidCents: MoneyCents;
  readonly finesPaidCents: MoneyCents;
  readonly evadedCents: MoneyCents;
  readonly grossCents: MoneyCents;
  readonly costsCents: MoneyCents;
  readonly assessedCents: MoneyCents;
  readonly entitlementIds: readonly string[];
};

export type TaxState = { readonly status: 'notStarted' } | TaxLedger;
