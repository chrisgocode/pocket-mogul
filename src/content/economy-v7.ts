import { dollars } from '@/domain/money';

import { economyV6 } from './economy-v6';
import { withMechanic } from './mechanicUpgrade';
import type { ContentInput } from './schema';

const gymMechanic = {
  kind: 'gym',
  unlockStage: 2,
  defaultTier: 'basic',
  joinsPerUnit: 300,
  visitBps: 5000,
  tiers: {
    basic: { feeCents: dollars('3'), churnBps: 300 },
    plus: { feeCents: dollars('4.50'), churnBps: 500 },
    elite: { feeCents: dollars('6.50'), churnBps: 800 },
  },
  classes: { maxLevel: 3, churnCutBps: 50, studioPercent: 3 },
  allHours: { stage: 5, priceMultiple: 150, capacityPercent: 20 },
} as const;

export const economyV7 = {
  ...economyV6,
  economyVersion: 7,
  businesses: withMechanic(economyV6.businesses, { id: 'gym_chain', mechanic: gymMechanic }),
} satisfies ContentInput;
