import type { CartSpot, Crowd, MenuItem } from './foodCartRules';

export type MenuOffer = 'offered' | 'withdrawn';

export type SecondWindow = 'none' | 'installed';

export type Crowds = Readonly<Record<CartSpot, Crowd>>;

export type FoodCartOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly spot: CartSpot;
      readonly crowds: Crowds;
      readonly menu: Readonly<Record<MenuItem, MenuOffer>>;
      readonly secondWindow: SecondWindow;
    };

export type ActiveFoodCart = Extract<FoodCartOperation, { status: 'active' }>;

export const NO_FOOD_CART: FoodCartOperation = { status: 'inactive' };
