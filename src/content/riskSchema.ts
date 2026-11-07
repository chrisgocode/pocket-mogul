import { z } from 'zod';

import { INCIDENT_CATEGORIES } from '@/domain/business/definition';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const wholePercent = z.number().int().min(0).max(100);
const lossPercent = z.number().int().min(1).max(99);

const incidentEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('treasury'), revenueDays: positiveInt }),
  z.object({ kind: z.literal('capacity'), percent: lossPercent, days: positiveInt }),
  z.object({ kind: z.literal('cost'), percent: positiveInt, days: positiveInt }),
]);

export const incidentSchema = z.object({
  id,
  name: z.string().min(1),
  category: z.enum(INCIDENT_CATEGORIES),
  chanceBps: z.number().int().min(1).max(10_000),
  effect: incidentEffectSchema,
});

export const riskRulesSchema = z.object({
  safeDaysAfterPurchase: nonNegativeInt,
  treasuryLossCapPercent: wholePercent,
  insuranceFromStage: positiveInt,
  premiumPercent: wholePercent,
  coveredLossPercent: wholePercent,
});

export type Incident = z.output<typeof incidentSchema>;
