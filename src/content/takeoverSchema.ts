import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

export const rivalSchema = z.object({
  id,
  name: z.string().min(1),
  units: positiveInt,
  quality: nonNegativeInt,
});

export const takeoverRulesSchema = z.object({
  fromStage: positiveInt,
  acceptFromPercent: positiveInt,
  acceptAllPercent: positiveInt,
  lockDays: positiveInt,
  offerPercents: z.array(positiveInt).min(1),
});

export type Rival = z.output<typeof rivalSchema>;
