import type { z } from 'zod';

import type { purchaseSchema } from './purchaseSchema';

const HOUR_MS = 3_600_000;

export const purchases: z.input<typeof purchaseSchema> = {
  goldenWalletTapMultiplier: 2,
  nightManagerOfflineCapMs: 24 * HOUR_MS,
};
