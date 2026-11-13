import type { GymTier } from './gymRules';

export type SetGymTier = {
  readonly type: 'SetGymTier';
  readonly businessId: string;
  readonly tier: GymTier;
};

export type SetClassLevel = {
  readonly type: 'SetClassLevel';
  readonly businessId: string;
  readonly level: number;
};

export type InstallAllHours = {
  readonly type: 'InstallAllHours';
  readonly businessId: string;
};

export type GymCommand = SetGymTier | SetClassLevel | InstallAllHours;
