import type { CartSpot, MenuItem } from './foodCartRules';

export type SetCartSpot = {
  readonly type: 'SetCartSpot';
  readonly businessId: string;
  readonly spot: CartSpot;
};

export type SetMenuItem = {
  readonly type: 'SetMenuItem';
  readonly businessId: string;
  readonly item: MenuItem;
  readonly offered: boolean;
};

export type InstallSecondWindow = {
  readonly type: 'InstallSecondWindow';
  readonly businessId: string;
};

export type FoodCartCommand = SetCartSpot | SetMenuItem | InstallSecondWindow;
