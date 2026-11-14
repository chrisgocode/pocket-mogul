import { z } from 'zod';

const positiveInt = z.number().int().positive();

export const purchaseSchema = z.object({
  goldenWalletTapMultiplier: positiveInt,
  nightManagerOfflineCapMs: positiveInt,
});

export const NO_PURCHASE_CONTENT = {
  goldenWalletTapMultiplier: 1,
  nightManagerOfflineCapMs: 1,
};
