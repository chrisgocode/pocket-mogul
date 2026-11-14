import { z } from 'zod';

const positiveInt = z.number().int().positive();

export const adRewardSchema = z.object({
  dailyLimits: z.object({
    rush_day: positiveInt,
    end_incident: positiveInt,
    redraw_lots: positiveInt,
    clear_takeover_lock: positiveInt,
    briefcase: positiveInt,
  }),
  rushDays: positiveInt,
  rushProfitBps: positiveInt,
  briefcaseMinutes: positiveInt,
});

export const NO_AD_REWARD_CONTENT = {
  dailyLimits: {
    rush_day: 1,
    end_incident: 1,
    redraw_lots: 1,
    clear_takeover_lock: 1,
    briefcase: 1,
  },
  rushDays: 1,
  rushProfitBps: 10_000,
  briefcaseMinutes: 1,
};
