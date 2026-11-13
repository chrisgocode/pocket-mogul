import { z } from 'zod';

import { COLLECTION_MEASURES } from '@/domain/collection/rules';
import { GOAL_MEASURES } from '@/domain/goalMeasures';
import { moneyCents } from '@/domain/money';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const title = z.string().min(1);
const positiveInt = z.number().int().positive();
const reward = z.bigint().nonnegative().default(0n).transform(moneyCents);

export const goalSchema = z.discriminatedUnion('kind', [
  z.object({
    id,
    kind: z.literal('first_action'),
    action: z.enum([
      'wallet_upgrade',
      'business_purchase',
      'rental_started',
      'stock_purchase',
      'crypto_purchase',
      'dividend_received',
    ]),
    title,
    reward,
  }),
  z.object({
    id,
    kind: z.literal('peak_net_worth'),
    threshold: z.bigint().positive().transform(moneyCents),
    title,
    reward,
  }),
  z.object({
    id,
    kind: z.literal('collection'),
    measure: z.enum(COLLECTION_MEASURES),
    count: positiveInt,
    title,
    reward,
  }),
  z.object({
    id,
    kind: z.literal('business_stage'),
    businessId: id,
    stage: positiveInt,
    title,
    reward,
  }),
  z.object({
    id,
    kind: z.literal('milestone'),
    measure: z.enum(GOAL_MEASURES),
    count: positiveInt,
    title,
    reward,
  }),
]);

export const rankSchema = z.object({
  id,
  title,
  threshold: z.bigint().nonnegative().transform(moneyCents),
});
