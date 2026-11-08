import { z } from 'zod';

import { parseMoneyCents } from '@/domain/money';

const MAX_RATE_BPS = 10_000;
const cents = z
  .string()
  .regex(/^-?\d+$/)
  .transform(parseMoneyCents);
const nonnegativeCents = z.string().regex(/^\d+$/).transform(parseMoneyCents);
const count = z.number().int().nonnegative();
const fraction = z.string().regex(/^\d+$/).transform(BigInt);
const filing = z.discriminatedUnion('status', [
  z.object({ status: z.literal('unfiled') }),
  z.object({ status: z.literal('honest') }),
  z.object({
    status: z.literal('pendingAudit'),
    dueAtMs: count,
    outcome: z.enum(['audit', 'clear']),
    fineCents: nonnegativeCents,
  }),
  z.object({ status: z.literal('audited') }),
  z.object({ status: z.literal('cleared') }),
  z.object({ status: z.literal('waived') }),
]);
const line = z.object({
  source: z.string().min(1),
  atMs: count,
  rateBps: count.max(MAX_RATE_BPS),
  grossCents: cents,
  costsCents: cents,
  profitCents: cents,
  lossOffsetCents: nonnegativeCents,
  baseCents: nonnegativeCents,
  taxCents: nonnegativeCents,
});
const pool = z.object({
  grossCents: cents,
  profitCents: cents,
  lossCents: nonnegativeCents,
  taxRemainder: fraction.refine((v) => v < 10_000n),
  ownerRemainder: fraction,
  grossRemainder: fraction,
});
const ledger = z.object({
  absence: z.union([
    z.object({ status: z.literal('none') }),
    z.object({
      status: z.literal('pending'),
      summary: z.object({
        grossCents: cents,
        costsCents: cents,
        estimatedCents: cents,
        collectedCents: nonnegativeCents,
        cashCents: cents,
        treasuryCents: cents,
      }),
    }),
  ]),
  status: z.enum(['active', 'exempt']),
  startedAtMs: count,
  dayEndsMs: count,
  returnEndsMs: count,
  returnStartedAtMs: count,
  rateBps: count.max(MAX_RATE_BPS),
  openingWealthCents: cents,
  pools: z.record(z.string(), pool),
  basis: z.record(z.string(), cents),
  lines: z.array(line),
  returns: z.array(
    z.object({
      id: count,
      fromMs: count,
      toMs: count,
      lines: z.array(line),
      amountCents: nonnegativeCents,
      filing,
    }),
  ),
  nextReturnId: count,
  debts: z.array(
    z.object({ returnId: count, principalCents: nonnegativeCents, fineCents: nonnegativeCents }),
  ),
  recoveryRemainder: fraction.refine((v) => v < 10_000n),
  paidCents: nonnegativeCents,
  finesPaidCents: nonnegativeCents,
  evadedCents: nonnegativeCents,
  grossCents: cents,
  costsCents: cents,
  assessedCents: nonnegativeCents,
  entitlementIds: z.array(z.string().min(1)),
});

export const savedTax = z.union([z.object({ status: z.literal('notStarted') }), ledger]);
