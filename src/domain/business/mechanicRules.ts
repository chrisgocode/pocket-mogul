import type { BakeryRules } from './bakeryRules';
import type { CarWashRules } from './carWashRules';
import type { CoffeeKioskRules } from './coffeeKioskRules';
import type { DeliveryRules } from './deliveryRules';
import type { FoodCartRules } from './foodCartRules';
import type { GymRules } from './gymRules';
import type { LaundromatRules } from './laundromatRules';
import type { VendingRules } from './vendingRules';

export type BusinessMechanic =
  | { readonly kind: 'shared_core' }
  | { readonly kind: 'vending'; readonly vending: VendingRules }
  | { readonly kind: 'car_wash'; readonly carWash: CarWashRules }
  | { readonly kind: 'delivery'; readonly delivery: DeliveryRules }
  | { readonly kind: 'food_cart'; readonly foodCart: FoodCartRules }
  | { readonly kind: 'coffee_kiosk'; readonly coffeeKiosk: CoffeeKioskRules }
  | { readonly kind: 'laundromat'; readonly laundromat: LaundromatRules }
  | { readonly kind: 'bakery'; readonly bakery: BakeryRules }
  | { readonly kind: 'gym'; readonly gym: GymRules };

export const SHARED_CORE: BusinessMechanic = { kind: 'shared_core' };
