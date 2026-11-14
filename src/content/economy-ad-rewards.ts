import type { z } from 'zod';

import type { adRewardSchema } from './adRewardSchema';

export const adRewards: z.input<typeof adRewardSchema> = {
  dailyLimits: {
    rush_day: 3,
    end_incident: 2,
    redraw_lots: 2,
    clear_takeover_lock: 1,
    briefcase: 1,
  },
  rushDays: 1,
  rushProfitBps: 20_000,
  briefcaseMinutes: 15,
};
