import { z } from 'zod';

import { COLLECTION_MEASURES } from '@/domain/collection/rules';
import { moneyCents } from '@/domain/money';

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');
const title = z.string().min(1);

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
  }),
  z.object({
    id,
    kind: z.literal('peak_net_worth'),
    threshold: z.bigint().positive().transform(moneyCents),
    title,
  }),
  z.object({
    id,
    kind: z.literal('collection'),
    measure: z.enum(COLLECTION_MEASURES),
    count: z.number().int().positive(),
    title,
  }),
]);
