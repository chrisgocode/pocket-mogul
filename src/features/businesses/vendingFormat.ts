import type { AvailableCardReaders } from '@/application/vendingView';
import type { RestockTarget } from '@/domain/business/vendingCommands';
import type { StockMix, VendingLocation } from '@/domain/business/vendingRules';

export const LOCATION_NAMES: Readonly<Record<VendingLocation, string>> = {
  office: 'Office',
  gym: 'Gym',
  school: 'School',
  station: 'Station',
  hospital: 'Hospital',
};

export const MIX_NAMES: Readonly<Record<StockMix, string>> = {
  snacks: 'Snacks',
  drinks: 'Drinks',
  healthy: 'Healthy',
  balanced: 'Balanced',
};

export type VendingActions = {
  readonly move: (route: { from: VendingLocation; to: VendingLocation }) => void;
  readonly setMix: (choice: { location: VendingLocation; mix: StockMix }) => void;
  readonly restock: (target: RestockTarget) => void;
  readonly dismissCoachMark: () => void;
  readonly installCardReaders: (readers: AvailableCardReaders) => void;
};
