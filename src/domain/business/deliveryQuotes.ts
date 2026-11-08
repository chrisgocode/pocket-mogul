import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { deliveryRulesOf, runningDelivery } from './deliveryDemand';
import type { ContractOffer } from './deliveryState';
import type { OwnedBusiness } from './owned';

export type SortingHubQuote =
  | {
      readonly status: 'locked';
      readonly unlockStage: number;
      readonly priceCents: MoneyCents;
      readonly capacityPercent: number;
    }
  | { readonly status: 'installed'; readonly capacityPercent: number }
  | {
      readonly status: 'available';
      readonly capacityPercent: number;
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export type ContractQuote = {
  readonly offer: ContractOffer;
  readonly profitCents: MoneyCents;
  readonly nextProfitCents: MoneyCents;
};

export function quoteSortingHub(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): SortingHubQuote | undefined {
  const rules = deliveryRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { sortingHub } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(sortingHub.priceMultiple));
  const { capacityPercent } = sortingHub;
  const running = runningDelivery(business, pricing);
  if (running === undefined || business.stage < sortingHub.stage) {
    return { status: 'locked', unlockStage: sortingHub.stage, priceCents, capacityPercent };
  }
  const { operation } = running;
  if (operation.sortingHub === 'installed') return { status: 'installed', capacityPercent };
  const installed = { ...business, delivery: { ...operation, sortingHub: 'installed' as const } };
  return {
    status: 'available',
    capacityPercent,
    priceCents,
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}

export function withAcceptedContract(
  business: OwnedBusiness,
  accepting: { readonly offer: ContractOffer; readonly day: number },
): OwnedBusiness {
  const { delivery } = business;
  if (delivery.status !== 'active') return business;
  const { offer, day } = accepting;
  const contract = {
    id: offer.id,
    clientId: offer.clientId,
    parcelsPerDay: offer.parcelsPerDay,
    rateCents: offer.rateCents,
    penaltyCents: offer.penaltyCents,
    endsDay: day + offer.days,
  };
  return {
    ...business,
    delivery: {
      ...delivery,
      offers: delivery.offers.filter((each) => each.id !== offer.id),
      contracts: [...delivery.contracts, contract],
    },
  };
}

export function quoteContract(
  business: OwnedBusiness,
  quoting: {
    readonly pricing: BusinessPricing;
    readonly offer: ContractOffer;
    readonly day: number;
  },
): ContractQuote {
  const accepted = withAcceptedContract(business, quoting);
  return {
    offer: quoting.offer,
    profitCents: profitPerDayCents(business, quoting.pricing),
    nextProfitCents: profitPerDayCents(accepted, quoting.pricing),
  };
}
