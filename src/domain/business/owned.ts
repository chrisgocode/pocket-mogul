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
import { NO_BAKERY, type BakeryOperation } from './bakeryRules';
import { NO_CAR_WASH, type CarWashOperation } from './carWashState';
import { NO_COFFEE_KIOSK, type CoffeeKioskOperation } from './coffeeKioskRules';
import { NO_DELIVERY, type DeliveryOperation } from './deliveryState';
import { NO_FACTORY, type FactoryOperation } from './factoryRules';
import { NO_FOOD_CART, type FoodCartOperation } from './foodCartState';
import { NO_GYM, type GymOperation } from './gymRules';
import { NO_HOTEL, type HotelOperation } from './hotelRules';
import { NO_LAUNDROMAT, type LaundromatOperation } from './laundromatRules';
import { NO_AIRLINE, type AirlineOperation } from './airlineRules';
import { NO_SPACE, type SpaceOperation } from './spaceRules';
import { NO_SYNERGIES } from './synergyRules';
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

export type RushDay =
  | { readonly status: 'none' }
  | { readonly status: 'active'; readonly endsDay: number; readonly profitBps: number };

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
  readonly rushDay: RushDay;
  readonly vending: VendingOperation;
  readonly carWash: CarWashOperation;
  readonly delivery: DeliveryOperation;
  readonly foodCart: FoodCartOperation;
  readonly coffeeKiosk: CoffeeKioskOperation;
  readonly laundromat: LaundromatOperation;
  readonly bakery: BakeryOperation;
  readonly gym: GymOperation;
  readonly hotel: HotelOperation;
  readonly factory: FactoryOperation;
  readonly airline: AirlineOperation;
  readonly space: SpaceOperation;
  readonly synergies: readonly string[];
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
    rushDay: { status: 'none' },
    vending: NO_VENDING,
    carWash: NO_CAR_WASH,
    delivery: NO_DELIVERY,
    foodCart: NO_FOOD_CART,
    coffeeKiosk: NO_COFFEE_KIOSK,
    laundromat: NO_LAUNDROMAT,
    bakery: NO_BAKERY,
    gym: NO_GYM,
    hotel: NO_HOTEL,
    factory: NO_FACTORY,
    airline: NO_AIRLINE,
    space: NO_SPACE,
    synergies: NO_SYNERGIES,
    takeovers: NO_TAKEOVERS,
    listing: { status: 'private' },
  };
}
