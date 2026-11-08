import { quoteBusinessDay } from './core';
import type { BusinessPricing } from './definition';
import { deliveryRulesOf, runningDelivery } from './deliveryDemand';
import { refreshedOffers } from './deliveryOffers';
import { recordedDay } from './deliveryReputation';
import type { ActiveDelivery } from './deliveryState';
import type { OwnedBusiness } from './owned';

export type DeliveryDayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

const OPENING: ActiveDelivery = {
  status: 'active',
  offers: [],
  contracts: [],
  history: [],
  sortingHub: 'none',
};

function withOffers(business: OwnedBusiness, start: DeliveryDayStart): OwnedBusiness {
  const running = runningDelivery(business, start.pricing);
  if (running === undefined) return business;
  const offers = refreshedOffers({ ...start, business, running });
  return { ...business, delivery: { ...running.operation, offers } };
}

export function withDeliveryUnlocked(
  business: OwnedBusiness,
  start: DeliveryDayStart,
): OwnedBusiness {
  const rules = deliveryRulesOf(start.pricing);
  if (rules === undefined || business.delivery.status === 'active') return business;
  if (business.stage < rules.unlockStage) return business;
  return withOffers({ ...business, delivery: OPENING }, start);
}

export function endedDeliveryDay(
  business: OwnedBusiness,
  ending: { readonly pricing: BusinessPricing; readonly day: number },
): OwnedBusiness {
  const running = runningDelivery(business, ending.pricing);
  if (running === undefined) return business;
  const { operation, rules } = running;
  const contracts = operation.contracts.filter((contract) => contract.endsDay > ending.day);
  if (business.status === 'closed') return { ...business, delivery: { ...operation, contracts } };
  const quote = quoteBusinessDay(business, ending.pricing);
  const day = {
    due: quote.contractParcels + quote.missedParcels,
    delivered: quote.contractParcels,
  };
  const history = recordedDay(operation.history, {
    day,
    windowDays: rules.reputation.windowDays,
  });
  return { ...business, delivery: { ...operation, contracts, history } };
}

export function startDeliveryDay(business: OwnedBusiness, start: DeliveryDayStart): OwnedBusiness {
  if (business.delivery.status === 'inactive') return withDeliveryUnlocked(business, start);
  return withOffers(business, start);
}
