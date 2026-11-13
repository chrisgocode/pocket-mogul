import { NO_BAKERY, type BakeryOperation } from '@/domain/business/bakeryRules';
import { NO_COFFEE_KIOSK, type CoffeeKioskOperation } from '@/domain/business/coffeeKioskRules';
import { NO_FACTORY, type FactoryOperation } from '@/domain/business/factoryRules';
import { NO_FOOD_CART, type FoodCartOperation } from '@/domain/business/foodCartState';
import { NO_GYM, type GymOperation } from '@/domain/business/gymRules';
import { NO_HOTEL, type HotelOperation } from '@/domain/business/hotelRules';
import { NO_LAUNDROMAT, type LaundromatOperation } from '@/domain/business/laundromatRules';
import type { OwnedBusiness } from '@/domain/business/owned';

type ByBusiness<Value> = Readonly<Record<string, Value>>;

export type SavedMechanics = {
  readonly foodCart: ByBusiness<FoodCartOperation>;
  readonly coffeeKiosk: ByBusiness<CoffeeKioskOperation>;
  readonly laundromat: ByBusiness<LaundromatOperation>;
  readonly bakery: ByBusiness<BakeryOperation>;
  readonly gym: ByBusiness<GymOperation>;
  readonly hotel: ByBusiness<HotelOperation>;
  readonly factory: ByBusiness<FactoryOperation>;
};

export type MechanicField = keyof SavedMechanics;

const byBusiness = <Value>(
  businesses: readonly OwnedBusiness[],
  pick: (business: OwnedBusiness) => Value,
) => Object.fromEntries(businesses.map((business) => [business.definitionId, pick(business)]));

export function savedMechanics(businesses: readonly OwnedBusiness[]): SavedMechanics {
  return {
    foodCart: byBusiness(businesses, (business) => business.foodCart),
    coffeeKiosk: byBusiness(businesses, (business) => business.coffeeKiosk),
    laundromat: byBusiness(businesses, (business) => business.laundromat),
    bakery: byBusiness(businesses, (business) => business.bakery),
    gym: byBusiness(businesses, (business) => business.gym),
    hotel: byBusiness(businesses, (business) => business.hotel),
    factory: byBusiness(businesses, (business) => business.factory),
  };
}

export function loadedMechanicFields(
  businessId: string,
  document: SavedMechanics,
): Pick<OwnedBusiness, MechanicField> {
  const saved = <Value>(record: ByBusiness<Value>, inactive: Value): Value =>
    record[businessId] ?? inactive;
  return {
    foodCart: saved(document.foodCart, NO_FOOD_CART),
    coffeeKiosk: saved(document.coffeeKiosk, NO_COFFEE_KIOSK),
    laundromat: saved(document.laundromat, NO_LAUNDROMAT),
    bakery: saved(document.bakery, NO_BAKERY),
    gym: saved(document.gym, NO_GYM),
    hotel: saved(document.hotel, NO_HOTEL),
    factory: saved(document.factory, NO_FACTORY),
  };
}

export function withoutMechanicFields<Holder extends Record<MechanicField, unknown>>(
  holder: Holder,
): Omit<Holder, MechanicField> {
  const {
    foodCart: _foodCart,
    coffeeKiosk: _coffeeKiosk,
    laundromat: _laundromat,
    bakery: _bakery,
    gym: _gym,
    hotel: _hotel,
    factory: _factory,
    ...rest
  } = holder;
  return rest;
}
