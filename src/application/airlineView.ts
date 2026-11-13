import { fuelDraw } from '@/domain/business/airline';
import {
  airlineRulesOf,
  networkBps,
  runningAirline,
  type RunningAirline,
} from '@/domain/business/airlineDemand';
import { fuelForecast } from '@/domain/business/airlineFuel';
import { quoteHub, type HubQuote } from '@/domain/business/airlineQuotes';
import {
  NETWORKS,
  type Fleet,
  type FleetShare,
  type FuelLevel,
  type Network,
} from '@/domain/business/airlineRules';
import { profitPerDayCents } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';
import type { MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const AIRLINE_COACH_MARK: CoachMark = 'airline';

export type FuelDayView = { readonly fuel: FuelLevel; readonly costPercent: number };

export type NetworkView = {
  readonly network: Network;
  readonly share: FleetShare;
  readonly farePercent: number;
  readonly seatsPercent: number;
  readonly burnPercent: number;
  readonly profitCents: MoneyCents;
  readonly best: boolean;
};

export type AvailableHub = Extract<HubQuote, { status: 'available' }> & Affordability;
export type HubOption = Exclude<HubQuote, { status: 'available' }> | AvailableHub;

export type AirlineView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly today: FuelDayView;
      readonly forecast: readonly FuelDayView[];
      readonly network: Network;
      readonly fleet: Fleet;
      readonly networks: readonly NetworkView[];
      readonly coachMark: 'show' | 'seen';
      readonly hub: HubOption;
    };

type AirlineContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

const fuelDay = (running: RunningAirline, fuel: FuelLevel): FuelDayView => ({
  fuel,
  costPercent: running.rules.fuelCostBps[fuel] / BPS_PER_PERCENT,
});

function networkViews(running: RunningAirline, context: AirlineContext): NetworkView[] {
  const { owned, pricing } = context;
  const { rules } = running;
  const settled = { ...running.operation, fleet: 'flying' as const };
  const profits = NETWORKS.map((network) =>
    profitPerDayCents({ ...owned, airline: { ...settled, network } }, pricing),
  );
  const best = profits.reduce((top, profit) => (profit > top ? profit : top));
  const percent = (network: Network, figure: 'fareBps' | 'seatsBps' | 'burnBps') =>
    Number(networkBps(rules, { network, figure })) / BPS_PER_PERCENT;
  return NETWORKS.map((network, index) => ({
    network,
    share: rules.networks[network],
    farePercent: percent(network, 'fareBps'),
    seatsPercent: percent(network, 'seatsBps'),
    burnPercent: percent(network, 'burnBps'),
    profitCents: profits[index] ?? best,
    best: profits[index] === best,
  }));
}

function hubOption(context: AirlineContext): HubOption {
  const quote = quoteHub(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectAirline(context: AirlineContext): AirlineView | undefined {
  const { owned, pricing } = context;
  const rules = airlineRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningAirline(owned, pricing);
  const draw = fuelDraw(owned, context);
  if (running === undefined || draw === undefined) {
    return { status: 'locked', unlockStage: rules.unlockStage };
  }
  const day = businessDayOf(context.simulationMs, pricing.rules);
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    today: fuelDay(running, running.operation.fuel),
    forecast: fuelForecast(draw, day).map((fuel) => fuelDay(running, fuel)),
    network: running.operation.network,
    fleet: running.operation.fleet,
    networks: networkViews(running, context),
    coachMark: context.seenCoachMarks.includes(AIRLINE_COACH_MARK) ? 'seen' : 'show',
    hub: hubOption(context),
  };
}
