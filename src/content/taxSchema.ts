import { z } from 'zod';

import { moneyCents } from '@/domain/money';

const BASIS_POINTS = 10_000;
const bps = z.number().int().min(0).max(BASIS_POINTS);
const positive = z.number().int().positive();

export const taxRulesSchema = z
  .object({
    bands: z
      .array(z.object({ upToCents: z.bigint().positive().transform(moneyCents), rateBps: bps }))
      .min(1),
    topRateBps: bps,
    returnDays: positive,
    auditDelayMs: positive,
    auditChanceBps: bps,
    fineMultiplier: positive,
    recoveryBps: bps,
    historyReturns: positive,
  })
  .refine(
    (rules) =>
      rules.bands.every(
        (band, index) =>
          index === 0 ||
          (band.upToCents > rules.bands[index - 1]!.upToCents &&
            band.rateBps >= rules.bands[index - 1]!.rateBps),
      ),
    'Tax bands must rise in wealth and rate',
  )
  .refine(
    (rules) => rules.topRateBps >= rules.bands[rules.bands.length - 1]!.rateBps,
    'Top tax rate cannot fall',
  );
