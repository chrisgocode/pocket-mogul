import type { CarWashRules } from './carWashRules';
import type { DeliveryRules } from './deliveryRules';
import type { VendingRules } from './vendingRules';

export type BusinessMechanic =
  | { readonly kind: 'shared_core' }
  | { readonly kind: 'vending'; readonly vending: VendingRules }
  | { readonly kind: 'car_wash'; readonly carWash: CarWashRules }
  | { readonly kind: 'delivery'; readonly delivery: DeliveryRules };

export const SHARED_CORE: BusinessMechanic = { kind: 'shared_core' };
