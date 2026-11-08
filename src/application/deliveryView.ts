import { quoteBusinessDay } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import {
  crewedVans,
  deliveryRulesOf,
  runningDelivery,
  serveContracts,
  type RunningDelivery,
} from '@/domain/business/deliveryDemand';
import { offerExpiresDay } from '@/domain/business/deliveryOffers';
import {
  quoteContract,
  quoteSortingHub,
  type SortingHubQuote,
} from '@/domain/business/deliveryQuotes';
import { reputationOf } from '@/domain/business/deliveryReputation';
import type { DeliveryRules } from '@/domain/business/deliveryRules';
import type { ContractOffer } from '@/domain/business/deliveryState';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';
import type { MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const DELIVERY_COACH_MARK: CoachMark = 'delivery';
const UNNAMED_CLIENT = 'A client';

export type OfferView = {
  readonly id: string;
  readonly client: string;
  readonly parcelsPerDay: number;
  readonly rateCents: MoneyCents;
  readonly penaltyCents: MoneyCents;
  readonly days: number;
  readonly expiresInDays: number;
  readonly profitCents: MoneyCents;
  readonly nextProfitCents: MoneyCents;
};

export type ContractView = {
  readonly id: string;
  readonly client: string;
  readonly parcelsPerDay: number;
  readonly delivered: number;
  readonly missed: number;
  readonly rateCents: MoneyCents;
  readonly penaltyCents: MoneyCents;
  readonly daysLeft: number;
};

export type ReputationView = {
  readonly stars: number;
  readonly onTimePercent: number | undefined;
  readonly windowDays: number;
};

export type FleetView = {
  readonly vans: number;
  readonly crewed: number;
  readonly vansPerDriver: number;
  readonly spareParcels: number;
};

export type AvailableSortingHub = Extract<SortingHubQuote, { status: 'available' }> & Affordability;
export type SortingHubOption =
  | Exclude<SortingHubQuote, { status: 'available' }>
  | AvailableSortingHub;

export type DeliveryView =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly vansPerDriver: number }
  | {
      readonly status: 'active';
      readonly coachMark: 'show' | 'seen';
      readonly reputation: ReputationView;
      readonly fleet: FleetView;
      readonly offers: readonly OfferView[];
      readonly contracts: readonly ContractView[];
      readonly sortingHub: SortingHubOption;
    };

type DeliveryContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

type Viewing = DeliveryContext & { readonly running: RunningDelivery; readonly day: number };

function clientName(rules: DeliveryRules, clientId: string): string {
  return rules.offers.clients.find((client) => client.id === clientId)?.name ?? UNNAMED_CLIENT;
}

function offerView(offer: ContractOffer, viewing: Viewing): OfferView {
  const { rules } = viewing.running;
  const quote = quoteContract(viewing.owned, { ...viewing, offer });
  return {
    id: offer.id,
    client: clientName(rules, offer.clientId),
    parcelsPerDay: offer.parcelsPerDay,
    rateCents: offer.rateCents,
    penaltyCents: offer.penaltyCents,
    days: offer.days,
    expiresInDays: offerExpiresDay(offer, rules.offers) - viewing.day,
    profitCents: quote.profitCents,
    nextProfitCents: quote.nextProfitCents,
  };
}

function contractViews(viewing: Viewing): ContractView[] {
  const { rules, operation } = viewing.running;
  const quote = quoteBusinessDay(viewing.owned, viewing.pricing);
  const served = serveContracts(operation.contracts, BigInt(quote.contractParcels)).contracts;
  return operation.contracts.map((contract, index) => ({
    id: contract.id,
    client: clientName(rules, contract.clientId),
    parcelsPerDay: contract.parcelsPerDay,
    delivered: served[index]?.delivered ?? 0,
    missed: served[index]?.missed ?? contract.parcelsPerDay,
    rateCents: contract.rateCents,
    penaltyCents: contract.penaltyCents,
    daysLeft: contract.endsDay - viewing.day,
  }));
}

function reputationView({ running }: Viewing): ReputationView {
  const { reputation } = running.rules;
  const { stars, onTimeBps } = reputationOf(running.operation.history, reputation);
  const onTimePercent = onTimeBps === undefined ? undefined : onTimeBps / BPS_PER_PERCENT;
  return { stars, onTimePercent, windowDays: reputation.windowDays };
}

function fleetView({ owned, pricing, running }: Viewing): FleetView {
  return {
    vans: owned.units,
    crewed: crewedVans(owned, running.rules),
    vansPerDriver: running.rules.vansPerDriver,
    spareParcels: quoteBusinessDay(owned, pricing).capacity,
  };
}

function sortingHubOption({ owned, pricing, running }: Viewing): SortingHubOption {
  const quote = quoteSortingHub(owned, pricing);
  const { capacityPercent } = running.rules.sortingHub;
  if (quote === undefined) return { status: 'installed', capacityPercent };
  if (quote.status !== 'available') return quote;
  return { ...quote, ...affordability(quote.priceCents, owned.treasuryCents) };
}

export function selectDelivery(context: DeliveryContext): DeliveryView | undefined {
  const rules = deliveryRulesOf(context.pricing);
  if (rules === undefined) return undefined;
  const running = runningDelivery(context.owned, context.pricing);
  if (running === undefined) {
    return { status: 'locked', unlockStage: rules.unlockStage, vansPerDriver: rules.vansPerDriver };
  }
  const day = businessDayOf(context.simulationMs, context.pricing.rules);
  const viewing = { ...context, running, day };
  return {
    status: 'active',
    coachMark: context.seenCoachMarks.includes(DELIVERY_COACH_MARK) ? 'seen' : 'show',
    reputation: reputationView(viewing),
    fleet: fleetView(viewing),
    offers: running.operation.offers.map((offer) => offerView(offer, viewing)),
    contracts: contractViews(viewing),
    sortingHub: sortingHubOption(viewing),
  };
}
