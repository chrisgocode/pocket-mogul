import type { z } from 'zod';

import { dollars } from '@/domain/money';

import type { briefingSchema } from './briefingSchema';

export const briefing: z.input<typeof briefingSchema> = {
  tasksPerDay: 3,
  minRewardCents: dollars('10'),
  bonusBps: 50,
  minBonusCents: dollars('25'),
  templates: [
    { id: 'brief_taps_200', measure: 'taps', count: 200, needs: 'nothing', rewardBps: 10 },
    { id: 'brief_taps_500', measure: 'taps', count: 500, needs: 'nothing', rewardBps: 20 },
    { id: 'brief_play_5', measure: 'play_minutes', count: 5, needs: 'nothing', rewardBps: 10 },
    { id: 'brief_play_15', measure: 'play_minutes', count: 15, needs: 'nothing', rewardBps: 20 },
    {
      id: 'brief_wallet_1',
      measure: 'wallet_upgrades',
      count: 1,
      needs: 'wallet_room',
      rewardBps: 10,
    },
    { id: 'brief_improve_1', measure: 'improvements', count: 1, needs: 'business', rewardBps: 15 },
    { id: 'brief_improve_3', measure: 'improvements', count: 3, needs: 'business', rewardBps: 25 },
    { id: 'brief_trades_1', measure: 'trades', count: 1, needs: 'trading', rewardBps: 10 },
    { id: 'brief_trades_3', measure: 'trades', count: 3, needs: 'trading', rewardBps: 20 },
    { id: 'brief_tax_1', measure: 'tax_returns', count: 1, needs: 'tax_return', rewardBps: 20 },
  ],
};
