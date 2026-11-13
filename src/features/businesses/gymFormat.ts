import type { AvailableAllHours } from '@/application/gymView';
import type { GymTier } from '@/domain/business/gymRules';

const BPS_PER_PERCENT = 100;

export const GYM_TIER_NAMES: Readonly<Record<GymTier, string>> = {
  basic: 'Basic',
  plus: 'Plus',
  elite: 'Elite',
};

export type GymActions = {
  readonly setTier: (tier: GymTier) => void;
  readonly setClassLevel: (level: number) => void;
  readonly dismissCoachMark: () => void;
  readonly installAllHours: (allHours: AvailableAllHours) => void;
};

export const bpsAsPercent = (bps: number) => `${bps / BPS_PER_PERCENT}%`;

export const classLevelName = (level: number) => (level === 0 ? 'None' : `Level ${level}`);
