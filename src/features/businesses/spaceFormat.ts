import type { AvailableBoosters } from '@/application/spaceView';
import type { Cadence, LaunchWeather } from '@/domain/business/spaceRules';

export const CADENCE_NAMES: Readonly<Record<Cadence, string>> = {
  careful: 'Careful',
  standard: 'Standard',
  rapid: 'Rapid',
};

export const LAUNCH_WEATHER_NAMES: Readonly<Record<LaunchWeather, string>> = {
  clear: 'Clear',
  windy: 'Windy',
  storm: 'Storm',
};

export type SpaceActions = {
  readonly setCadence: (cadence: Cadence) => void;
  readonly answerPayloadOffer: (answer: { offerId: number; answer: 'accept' | 'decline' }) => void;
  readonly dismissCoachMark: () => void;
  readonly installBoosters: (boosters: AvailableBoosters) => void;
};
