import { moneyCents } from '@/domain/money';

import type { BusinessPricing } from './definition';
import { factoryRulesOf, runningFactory, type RunningFactory } from './factoryDemand';
import { bulkOfferOn, type BulkOfferDraw } from './factoryOffers';
import {
  NO_BULK_OFFER_ANSWERED,
  type ActiveFactory,
  type BulkOffer,
  type BulkOrder,
} from './factoryRules';
import type { OwnedBusiness } from './owned';

const PERCENT = 100;
const BASIS_POINTS = 10_000n;

export function withFactoryUnlocked(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): OwnedBusiness {
  const rules = factoryRulesOf(pricing);
  if (rules === undefined || business.factory.status === 'active') return business;
  if (business.stage < rules.unlockStage) return business;
  const factory: ActiveFactory = {
    status: 'active',
    product: rules.defaultProduct,
    retoolDaysLeft: 0,
    orders: [],
    answeredOffer: NO_BULK_OFFER_ANSWERED,
    automation: 'none',
  };
  return { ...business, factory };
}

export function bulkOfferDraw(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly seed: string },
): BulkOfferDraw | undefined {
  const rules = factoryRulesOf(start.pricing);
  if (rules === undefined) return undefined;
  return { seed: start.seed, businessId: business.definitionId, rules };
}

export function openBulkOffer(
  running: RunningFactory,
  board: { readonly draw: BulkOfferDraw; readonly day: number },
): BulkOffer | undefined {
  const offer = bulkOfferOn(board.draw, board.day);
  const full = running.operation.orders.length >= running.rules.bulk.maxOrders;
  return full || offer.id <= running.operation.answeredOffer ? undefined : offer;
}

export function bulkOrderFrom(
  offer: BulkOffer,
  taking: {
    readonly business: OwnedBusiness;
    readonly pricing: BusinessPricing;
    readonly penaltyBps: number;
    readonly day: number;
  },
): BulkOrder {
  const { definition } = taking.pricing;
  const baseBatches = definition.capacityPerUnit * taking.business.units;
  const priced = (bps: number) =>
    moneyCents((definition.pricePerCustomerCents * BigInt(bps)) / BASIS_POINTS);
  return {
    clientId: offer.clientId,
    parcelsPerDay: Math.floor((baseBatches * offer.sizePercent) / PERCENT),
    rateCents: priced(offer.rateBps),
    penaltyCents: priced(taking.penaltyBps),
    endsDay: taking.day + offer.days,
  };
}

export function startFactoryDay(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly day: number },
): OwnedBusiness {
  const unlocked = withFactoryUnlocked(business, start.pricing);
  const running = runningFactory(unlocked, start.pricing);
  if (running === undefined) return unlocked;
  const { operation } = running;
  const orders = operation.orders.filter((order) => order.endsDay > start.day);
  const retoolDaysLeft = Math.max(0, operation.retoolDaysLeft - 1);
  return { ...unlocked, factory: { ...operation, orders, retoolDaysLeft } };
}
