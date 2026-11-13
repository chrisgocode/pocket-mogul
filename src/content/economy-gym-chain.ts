import { dollars } from '@/domain/money';

export const gymMechanic = {
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
