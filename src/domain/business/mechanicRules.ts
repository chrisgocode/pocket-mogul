import type { BakeryRules } from './bakeryRules';
import type { CarWashRules } from './carWashRules';
import type { CoffeeKioskRules } from './coffeeKioskRules';
import type { DeliveryRules } from './deliveryRules';
import type { FactoryRules } from './factoryRules';
import type { FoodCartRules } from './foodCartRules';
import type { GymRules } from './gymRules';
import type { HotelRules } from './hotelRules';
import type { LaundromatRules } from './laundromatRules';
import type { VendingRules } from './vendingRules';
import type { AirlineRules } from './airlineRules';

export type BusinessMechanic =
  | { readonly kind: 'shared_core' }
  | { readonly kind: 'vending'; readonly vending: VendingRules }
  | { readonly kind: 'car_wash'; readonly carWash: CarWashRules }
  | { readonly kind: 'delivery'; readonly delivery: DeliveryRules }
  | { readonly kind: 'food_cart'; readonly foodCart: FoodCartRules }
  | { readonly kind: 'coffee_kiosk'; readonly coffeeKiosk: CoffeeKioskRules }
  | { readonly kind: 'laundromat'; readonly laundromat: LaundromatRules }
  | { readonly kind: 'bakery'; readonly bakery: BakeryRules }
  | { readonly kind: 'gym'; readonly gym: GymRules }
  | { readonly kind: 'hotel'; readonly hotel: HotelRules }
  | { readonly kind: 'factory'; readonly factory: FactoryRules }
  | { readonly kind: 'airline'; readonly airline: AirlineRules };

export const SHARED_CORE: BusinessMechanic = { kind: 'shared_core' };
