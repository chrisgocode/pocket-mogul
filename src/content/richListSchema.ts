import { z } from 'zod';

import { moneyCents } from '@/domain/money';

const MAX_PERCENT = 100;
const MAX_BPS = 9999;

export const mogulSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case'),
  name: z.string().min(1),
  sector: z.string().min(1),
  startCents: z.bigint().positive().transform(moneyCents),
  growthBps: z.number().int().positive(),
  setbackPercent: z.number().int().nonnegative().max(MAX_PERCENT),
  setbackBps: z.number().int().nonnegative().max(MAX_BPS),
});
