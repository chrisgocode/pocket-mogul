import type { Listing } from './listingState';
import { moneyCents, type MoneyCents } from '@/domain/money';

import {
  businessDayOf,
  NO_STAFF,
  type BusinessDefinition,
  type BusinessRules,
  type BusinessTrack,
  type IncidentCategory,
  type PriceLevel,
  type StaffCounts,
} from './definition';
import { NO_CAR_WASH, type CarWashOperation } from './carWashState';
import { NO_COFFEE_KIOSK, type CoffeeKioskOperation } from './coffeeKioskRules';
import { NO_DELIVERY, type DeliveryOperation } from './deliveryState';
import { NO_FOOD_CART, type FoodCartOperation } from './foodCartState';
import { NO_LAUNDROMAT, type LaundromatOperation } from './laundromatRules';
import { NO_TAKEOVERS, type Takeovers } from './takeoverState';
import { NO_VENDING, type VendingOperation } from './vendingRules';

export type BusinessStatus = 'open' | 'closed';

export type PolicyStatus = 'none' | 'active' | 'lapsed';
export type Insurance = Readonly<Record<IncidentCategory, PolicyStatus>>;

export const NO_INSURANCE: Insurance = { equipment: 'none', liability: 'none', supply: 'none' };

export type ActiveIncident =
  | { readonly status: 'none' }
  | {
      readonly status: 'active';
      readonly incidentId: string;
      readonly endsDay: number;
      readonly capacityBps: number;
      readonly costBps: number;
    };

export const NO_INCIDENT: ActiveIncident = { status: 'none' };

export type OwnedBusiness = {
  readonly definitionId: string;
  readonly stage: number;
  readonly units: number;
  readonly priceLevel: PriceLevel;
  readonly levels: Readonly<Record<BusinessTrack, number>>;
  readonly staff: StaffCounts;
  readonly payoutPercent: number;
  readonly treasuryCents: MoneyCents;
  readonly profitRemainder: number;
  readonly payoutRemainder: number;
  readonly status: BusinessStatus;
  readonly purchasedDay: number;
  readonly capitalizedSpendCents: MoneyCents;
  readonly insurance: Insurance;
  readonly incident: ActiveIncident;
  readonly vending: VendingOperation;
  readonly carWash: CarWashOperation;
  readonly delivery: DeliveryOperation;
  readonly foodCart: FoodCartOperation;
  readonly coffeeKiosk: CoffeeKioskOperation;
  readonly laundromat: LaundromatOperation;
  readonly takeovers: Takeovers;
  readonly listing: Listing;
};

const FIRST_STAGE = 1;

export function newBusiness(
  definition: BusinessDefinition,
  opening: { readonly rules: BusinessRules; readonly atMs: number },
): OwnedBusiness {
  return {
    definitionId: definition.id,
    stage: FIRST_STAGE,
    units: 1,
    priceLevel: opening.rules.defaultPriceLevel,
    levels: { quality: 0, efficiency: 0 },
    staff: NO_STAFF,
    payoutPercent: opening.rules.defaultPayoutPercent,
    treasuryCents: moneyCents(0),
    profitRemainder: 0,
    payoutRemainder: 0,
    status: 'open',
    purchasedDay: businessDayOf(opening.atMs, opening.rules),
    capitalizedSpendCents: definition.price,
    insurance: NO_INSURANCE,
    incident: NO_INCIDENT,
    vending: NO_VENDING,
    carWash: NO_CAR_WASH,
    delivery: NO_DELIVERY,
    foodCart: NO_FOOD_CART,
    coffeeKiosk: NO_COFFEE_KIOSK,
    laundromat: NO_LAUNDROMAT,
    takeovers: NO_TAKEOVERS,
    listing: { status: 'private' },
  };
}
