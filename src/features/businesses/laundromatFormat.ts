import type { AvailablePickup } from '@/application/laundromatView';

export type LaundromatActions = {
  readonly setJumboShare: (percent: number) => void;
  readonly setServiceLevel: (level: number) => void;
  readonly dismissCoachMark: () => void;
  readonly installPickup: (pickup: AvailablePickup) => void;
};

export const jumboShareName = (percent: number) => (percent === 0 ? 'None' : `${percent}%`);

export const serviceLevelName = (level: number) => (level === 0 ? 'Off' : `Level ${level}`);
