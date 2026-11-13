import type { AvailableHub } from '@/application/airlineView';
import type { FuelLevel, Network } from '@/domain/business/airlineRules';

export const NETWORK_NAMES: Readonly<Record<Network, string>> = {
  regional: 'Regional',
  mixed: 'Mixed',
  intercontinental: 'Intercontinental',
};

export const FUEL_NAMES: Readonly<Record<FuelLevel, string>> = {
  cheap: 'Cheap',
  normal: 'Normal',
  expensive: 'Expensive',
};

export type AirlineActions = {
  readonly setNetwork: (network: Network) => void;
  readonly dismissCoachMark: () => void;
  readonly installHub: (hub: AvailableHub) => void;
};
