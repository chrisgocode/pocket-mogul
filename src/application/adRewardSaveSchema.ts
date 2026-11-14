import { z } from 'zod';

import { DAILY_AD_REWARDS } from '@/domain/adRewards';
import { parseMoneyCents } from '@/domain/money';

const count = z.number().int().nonnegative();
const cents = z.string().regex(/^\d+$/).transform(parseMoneyCents);

export const savedAdRewards = z.object({
  dayKey: z.string(),
  used: z.partialRecord(z.enum(DAILY_AD_REWARDS), count),
  lotRedraws: z.object({ period: count, count }),
  offlineDouble: z.discriminatedUnion('status', [
    z.object({ status: z.literal('none') }),
    z.object({
      status: z.literal('claimed'),
      bonus: z.object({ businesses: cents, rent: cents, dividends: cents }),
    }),
  ]),
});

export const NO_SAVED_AD_REWARDS = {
  dayKey: '',
  used: {},
  lotRedraws: { period: 0, count: 0 },
  offlineDouble: { status: 'none' as const },
};

export const savedRushDay = z.discriminatedUnion('status', [
  z.object({ status: z.literal('none') }),
  z.object({ status: z.literal('active'), endsDay: count, profitBps: count }),
]);
