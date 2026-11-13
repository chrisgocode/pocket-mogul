import { profitPerDayCents, quoteBusinessDay } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { openPayloadOffer, payloadContractFrom, spaceDraw } from '@/domain/business/space';
import { runningSpace, spaceRulesOf, type RunningSpace } from '@/domain/business/spaceDemand';
import { quoteBoosters, type BoostersQuote } from '@/domain/business/spaceQuotes';
import {
  CADENCES,
  type Cadence,
  type LaunchWeather,
  type PayloadContract,
} from '@/domain/business/spaceRules';
import { launchForecast } from '@/domain/business/spaceWeather';
import type { CoachMark } from '@/domain/coachMarks';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const BASIS_POINTS = 10_000;
const SPACE_COACH_MARK: CoachMark = 'space';

export type CadenceView = {
  readonly cadence: Cadence;
  readonly launchesPercent: number;
  readonly profitCents: MoneyCents;
  readonly best: boolean;
};

export type PayloadContractView = {
  readonly client: string;
  readonly payloadsPerDay: number;
  readonly rateCents: MoneyCents;
  readonly penaltyCents: MoneyCents;
  readonly daysLeft: number;
};

export type PayloadOfferView = PayloadContractView & {
  readonly id: number;
  readonly profitChangeCents: MoneyCents;
};

export type PayloadsView = {
  readonly contracts: readonly PayloadContractView[];
  readonly maxContracts: number;
  readonly due: number;
  readonly launched: number;
  readonly offer: PayloadOfferView | undefined;
};

export type AvailableBoosters = Extract<BoostersQuote, { status: 'available' }> & Affordability;
export type BoostersOption = Exclude<BoostersQuote, { status: 'available' }> | AvailableBoosters;

export type SpaceView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly weather: LaunchWeather;
      readonly forecast: readonly LaunchWeather[];
      readonly cadence: Cadence;
      readonly cadences: readonly CadenceView[];
      readonly payloads: PayloadsView;
      readonly coachMark: 'show' | 'seen';
      readonly boosters: BoostersOption;
    };

type SpaceContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

type Launching = SpaceContext & { readonly running: RunningSpace; readonly day: number };

function cadenceViews(launching: Launching): CadenceView[] {
  const { owned, pricing, running } = launching;
  const { operation, rules } = running;
  const profits = CADENCES.map((cadence) =>
    profitPerDayCents({ ...owned, space: { ...operation, cadence } }, pricing),
  );
  const best = profits.reduce((top, profit) => (profit > top ? profit : top));
  return CADENCES.map((cadence, index) => {
    const rule = rules.cadences[cadence];
    const launched = (rule.capacityBps * rule.launchedBps[operation.weather]) / BASIS_POINTS;
    return {
      cadence,
      launchesPercent: launched / BPS_PER_PERCENT,
      profitCents: profits[index] ?? best,
      best: profits[index] === best,
    };
  });
}

function contractView(contract: PayloadContract, launching: Launching): PayloadContractView {
  const clients = launching.running.rules.payloads.clients;
  return {
    client: clients.find((client) => client.id === contract.clientId)?.name ?? contract.clientId,
    payloadsPerDay: contract.parcelsPerDay,
    rateCents: contract.rateCents,
    penaltyCents: contract.penaltyCents,
    daysLeft: contract.endsDay - launching.day,
  };
}

function offerView(launching: Launching): PayloadOfferView | undefined {
  const { owned, pricing, running, day } = launching;
  const draw = spaceDraw(owned, launching);
  const offer = draw === undefined ? undefined : openPayloadOffer(running, { draw, day });
  if (offer === undefined) return undefined;
  const { penaltyBps } = running.rules.payloads;
  const contract = payloadContractFrom(offer, { business: owned, pricing, penaltyBps, day });
  const contracts = [...running.operation.contracts, contract];
  const taken = { ...owned, space: { ...running.operation, contracts } };
  return {
    ...contractView(contract, launching),
    id: offer.id,
    profitChangeCents: moneyCents(
      profitPerDayCents(taken, pricing) - profitPerDayCents(owned, pricing),
    ),
  };
}

function payloadsView(launching: Launching): PayloadsView {
  const quote = quoteBusinessDay(launching.owned, launching.pricing);
  const { operation, rules } = launching.running;
  return {
    contracts: operation.contracts.map((contract) => contractView(contract, launching)),
    maxContracts: rules.payloads.maxContracts,
    due: quote.contractParcels + quote.missedParcels,
    launched: quote.contractParcels,
    offer: offerView(launching),
  };
}

function boostersOption(context: SpaceContext): BoostersOption {
  const quote = quoteBoosters(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectSpace(context: SpaceContext): SpaceView | undefined {
  const { owned, pricing } = context;
  const rules = spaceRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningSpace(owned, pricing);
  const draw = spaceDraw(owned, context);
  if (running === undefined || draw === undefined) {
    return { status: 'locked', unlockStage: rules.unlockStage };
  }
  const day = businessDayOf(context.simulationMs, pricing.rules);
  const launching = { ...context, running, day };
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    weather: running.operation.weather,
    forecast: launchForecast(draw, day),
    cadence: running.operation.cadence,
    cadences: cadenceViews(launching),
    payloads: payloadsView(launching),
    coachMark: context.seenCoachMarks.includes(SPACE_COACH_MARK) ? 'seen' : 'show',
    boosters: boostersOption(context),
  };
}
