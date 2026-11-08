import type { OptionalPackage, Weather } from './carWashRules';
import type { PriceLevel } from './definition';

export type PackageOffer = 'offered' | 'withdrawn';

export type Detailing = 'none' | 'installed';

export type CarWashOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly weather: Weather;
      readonly packages: Readonly<Record<OptionalPackage, PackageOffer>>;
      readonly members: number;
      readonly membershipLevel: PriceLevel;
      readonly memberCapPercent: number;
      readonly detailing: Detailing;
    };

export type ActiveCarWash = Extract<CarWashOperation, { status: 'active' }>;

export const NO_CAR_WASH: CarWashOperation = { status: 'inactive' };
