import { z } from 'zod';

import { BRIEFING_MEASURES, BRIEFING_NEEDS } from '@/domain/briefing';
import { moneyCents } from '@/domain/money';

const positiveInt = z.number().int().positive();
const money = z.bigint().positive().transform(moneyCents);

const templateSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case'),
  measure: z.enum(BRIEFING_MEASURES),
  count: positiveInt,
  needs: z.enum(BRIEFING_NEEDS),
  rewardBps: positiveInt,
});

export const briefingSchema = z.object({
  tasksPerDay: positiveInt,
  minRewardCents: money,
  bonusBps: positiveInt,
  minBonusCents: money,
  templates: z.array(templateSchema),
});

export const NO_BRIEFING_CONTENT = {
  tasksPerDay: 1,
  minRewardCents: moneyCents(1),
  bonusBps: 1,
  minBonusCents: moneyCents(1),
  templates: [],
};
