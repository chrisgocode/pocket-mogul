import type { AvailableSecondWindow } from '@/application/foodCartView';
import type { CartSpot, Crowd, MenuItem } from '@/domain/business/foodCartRules';

export const SPOT_NAMES: Readonly<Record<CartSpot, string>> = {
  park: 'Park',
  offices: 'Office row',
  campus: 'Campus',
  market: 'Night market',
  stadium: 'Stadium',
};

export const CROWD_NAMES: Readonly<Record<Crowd, string>> = {
  quiet: 'Quiet',
  steady: 'Steady',
  busy: 'Busy',
};

export const MENU_ITEM_NAMES: Readonly<Record<MenuItem, string>> = {
  combo: 'Combo meals',
  snacks: 'Street snacks',
  express: 'Grab-and-go wraps',
};

export type FoodCartActions = {
  readonly setSpot: (spot: CartSpot) => void;
  readonly setMenuItem: (change: { item: MenuItem; offered: boolean }) => void;
  readonly dismissCoachMark: () => void;
  readonly installSecondWindow: (secondWindow: AvailableSecondWindow) => void;
};
