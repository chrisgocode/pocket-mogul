import type { AvailableDetailing } from '@/application/carWashView';
import type { OptionalPackage, WashPackage, Weather } from '@/domain/business/carWashRules';
import type { PriceLevel } from '@/domain/business/definition';

export const WEATHER_NAMES: Readonly<Record<Weather, string>> = {
  sunny: 'Sunny',
  cloudy: 'Cloudy',
  rain: 'Rain',
  after_rain: 'After rain',
};

export const PACKAGE_NAMES: Readonly<Record<WashPackage, string>> = {
  basic: 'Basic',
  deluxe: 'Deluxe',
  ultimate: 'Ultimate',
  detailing: 'Detailing',
};

export type CarWashActions = {
  readonly setPackage: (change: { washPackage: OptionalPackage; offered: boolean }) => void;
  readonly setMembershipPrice: (priceLevel: PriceLevel) => void;
  readonly setMemberCap: (capPercent: number) => void;
  readonly dismissCoachMark: () => void;
  readonly installDetailing: (detailing: AvailableDetailing) => void;
};
