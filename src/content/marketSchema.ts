import { z } from 'zod';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const nonNegativeBps = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();

export const eventTemplateSchema = z.object({
  id,
  market: z.enum(['stocks', 'crypto']),
  scope: z.enum(['company', 'sector', 'market', 'coin']),
  direction: z.enum(['up', 'down']),
  headline: z.string().min(1),
});

export const marketParamsSchema = z.object({
  commonShockBps: nonNegativeBps,
  sectorShockBps: nonNegativeBps,
  assetShockBps: nonNegativeBps,
  regimeDriftBps: nonNegativeBps,
  eventDriftBps: nonNegativeBps,
  eventDurationTicks: positiveInt,
  feeBps: nonNegativeBps,
});
