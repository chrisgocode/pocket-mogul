import type { MoneyCents } from '@/domain/money';

export const WASH_PACKAGES = ['basic', 'deluxe', 'ultimate', 'detailing'] as const;
export type WashPackage = (typeof WASH_PACKAGES)[number];

export const STANDARD_PACKAGES = ['basic', 'deluxe', 'ultimate'] as const;
export type StandardPackage = (typeof STANDARD_PACKAGES)[number];

export const OPTIONAL_PACKAGES = ['deluxe', 'ultimate'] as const;
export type OptionalPackage = (typeof OPTIONAL_PACKAGES)[number];

export const WEATHERS = ['sunny', 'cloudy', 'rain', 'after_rain'] as const;
export type Weather = (typeof WEATHERS)[number];

export const DRAWN_WEATHERS = ['sunny', 'cloudy', 'rain'] as const;
export type DrawnWeather = (typeof DRAWN_WEATHERS)[number];

export type WashPackageRule = {
  readonly priceBps: number;
  readonly bayBps: number;
  readonly sharePercent: number;
};

export type DetailingRule = WashPackageRule & {
  readonly stage: number;
  readonly priceMultiple: number;
};

export type MembershipRules = {
  readonly feeCents: MoneyCents;
  readonly bayBps: number;
  readonly joinsPerUnit: number;
  readonly capStepPercent: number;
  readonly maxCapPercent: number;
  readonly defaultCapPercent: number;
  readonly managerCapPercent: { readonly rainAhead: number; readonly clear: number };
};

export type CarWashRules = {
  readonly unlockStage: number;
  readonly packages: Readonly<Record<StandardPackage, WashPackageRule>>;
  readonly weatherChanceBps: Readonly<Record<DrawnWeather, number>>;
  readonly weatherDemandBps: Readonly<Record<Weather, number>>;
  readonly forecastDays: number;
  readonly memberships: MembershipRules;
  readonly detailing: DetailingRule;
};
