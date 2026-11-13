import type { ContractTerms } from './deliveryState';

export const CADENCES = ['careful', 'standard', 'rapid'] as const;
export type Cadence = (typeof CADENCES)[number];

export const LAUNCH_WEATHERS = ['clear', 'windy', 'storm'] as const;
export type LaunchWeather = (typeof LAUNCH_WEATHERS)[number];

export type WeatherBps = Readonly<Record<LaunchWeather, number>>;

export type CadenceRule = { readonly capacityBps: number; readonly launchedBps: WeatherBps };

export type Range = { readonly min: number; readonly max: number };

export type PayloadRules = {
  readonly offerDays: number;
  readonly maxContracts: number;
  readonly clients: readonly { readonly id: string; readonly name: string }[];
  readonly sizePercents: readonly number[];
  readonly rateBps: Range;
  readonly penaltyBps: number;
  readonly days: Range;
};

export type BoosterRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly capacityPercent: number;
};

export type SpaceRules = {
  readonly unlockStage: number;
  readonly defaultCadence: Cadence;
  readonly weatherChanceBps: WeatherBps;
  readonly forecastDays: number;
  readonly cadences: Readonly<Record<Cadence, CadenceRule>>;
  readonly payloads: PayloadRules;
  readonly boosters: BoosterRule;
};

export type PayloadContract = ContractTerms & {
  readonly clientId: string;
  readonly endsDay: number;
};

export type PayloadOffer = {
  readonly id: number;
  readonly clientId: string;
  readonly sizePercent: number;
  readonly rateBps: number;
  readonly days: number;
};

export type Boosters = 'none' | 'installed';

export type SpaceOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly cadence: Cadence;
      readonly weather: LaunchWeather;
      readonly contracts: readonly PayloadContract[];
      readonly answeredOffer: number;
      readonly boosters: Boosters;
    };

export type ActiveSpace = Extract<SpaceOperation, { status: 'active' }>;

export const NO_SPACE: SpaceOperation = { status: 'inactive' };

export const NO_PAYLOAD_OFFER_ANSWERED = -1;
