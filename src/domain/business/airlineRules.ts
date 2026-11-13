export const ROUTES = ['short', 'medium', 'long'] as const;
export type Route = (typeof ROUTES)[number];

export const NETWORKS = ['regional', 'mixed', 'intercontinental'] as const;
export type Network = (typeof NETWORKS)[number];

export const FUEL_LEVELS = ['cheap', 'normal', 'expensive'] as const;
export type FuelLevel = (typeof FUEL_LEVELS)[number];

export type RouteRule = {
  readonly fareBps: number;
  readonly seatsBps: number;
  readonly burnBps: number;
};

export type FleetShare = Readonly<Record<Route, number>>;

export type HubRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly capacityPercent: number;
};

export type AirlineRules = {
  readonly unlockStage: number;
  readonly defaultNetwork: Network;
  readonly routes: Readonly<Record<Route, RouteRule>>;
  readonly networks: Readonly<Record<Network, FleetShare>>;
  readonly fuelChanceBps: Readonly<Record<FuelLevel, number>>;
  readonly fuelCostBps: Readonly<Record<FuelLevel, number>>;
  readonly forecastDays: number;
  readonly repositionCapacityBps: number;
  readonly hub: HubRule;
};

export type Hub = 'none' | 'installed';
export type Fleet = 'flying' | 'repositioning';

export type AirlineOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly network: Network;
      readonly fuel: FuelLevel;
      readonly fleet: Fleet;
      readonly hub: Hub;
    };

export type ActiveAirline = Extract<AirlineOperation, { status: 'active' }>;

export const NO_AIRLINE: AirlineOperation = { status: 'inactive' };
