import type { MoneyCents } from '@/domain/money';

export const GYM_TIERS = ['basic', 'plus', 'elite'] as const;
export type GymTier = (typeof GYM_TIERS)[number];

export type GymTierRule = { readonly feeCents: MoneyCents; readonly churnBps: number };

export type ClassRule = {
  readonly maxLevel: number;
  readonly churnCutBps: number;
  readonly studioPercent: number;
};

export type AllHoursRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly capacityPercent: number;
};

export type GymRules = {
  readonly unlockStage: number;
  readonly defaultTier: GymTier;
  readonly joinsPerUnit: number;
  readonly visitBps: number;
  readonly tiers: Readonly<Record<GymTier, GymTierRule>>;
  readonly classes: ClassRule;
  readonly allHours: AllHoursRule;
};

export type AllHours = 'none' | 'installed';

export type GymOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly members: number;
      readonly tier: GymTier;
      readonly classLevel: number;
      readonly allHours: AllHours;
    };

export type ActiveGym = Extract<GymOperation, { status: 'active' }>;

export const NO_GYM: GymOperation = { status: 'inactive' };
