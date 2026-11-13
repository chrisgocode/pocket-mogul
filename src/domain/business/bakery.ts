import { bakeryRulesOf, runningBakery, type RunningBakery } from './bakeryDemand';
import { wholesaleOfferOn, type OfferDraw } from './bakeryOffers';
import {
  NO_OFFER_ANSWERED,
  type ActiveBakery,
  type WholesaleOffer,
  type WholesaleOrder,
} from './bakeryRules';
import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

const PERCENT = 100;
const FULL_BAKE = 100;

export function withBakeryUnlocked(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): OwnedBusiness {
  const rules = bakeryRulesOf(pricing);
  if (rules === undefined || business.bakery.status === 'active') return business;
  if (business.stage < rules.unlockStage) return business;
  const bakery: ActiveBakery = {
    status: 'active',
    bakePercent: FULL_BAKE,
    orders: [],
    answeredOffer: NO_OFFER_ANSWERED,
    centralKitchen: 'none',
  };
  return { ...business, bakery };
}

export function offerDraw(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly seed: string },
): OfferDraw | undefined {
  const rules = bakeryRulesOf(start.pricing);
  if (rules === undefined) return undefined;
  return { seed: start.seed, businessId: business.definitionId, rules };
}

export function openOffer(
  running: RunningBakery,
  board: { readonly draw: OfferDraw; readonly day: number },
): WholesaleOffer | undefined {
  const offer = wholesaleOfferOn(board.draw, board.day);
  const full = running.operation.orders.length >= running.rules.wholesale.maxOrders;
  return full || offer.id <= running.operation.answeredOffer ? undefined : offer;
}

export function orderFrom(
  offer: WholesaleOffer,
  taking: {
    readonly business: OwnedBusiness;
    readonly pricing: BusinessPricing;
    readonly day: number;
  },
): WholesaleOrder {
  const baseOrders = taking.pricing.definition.capacityPerUnit * taking.business.units;
  return {
    clientId: offer.clientId,
    ordersPerDay: Math.floor((baseOrders * offer.sizePercent) / PERCENT),
    priceBps: offer.priceBps,
    endsDay: taking.day + offer.days,
  };
}

export function withBakeLevel(
  business: OwnedBusiness,
  change: { readonly operation: ActiveBakery; readonly bakePercent: number },
): OwnedBusiness {
  return { ...business, bakery: { ...change.operation, bakePercent: change.bakePercent } };
}

export function bestBakeLevel(business: OwnedBusiness, pricing: BusinessPricing): number {
  const running = runningBakery(business, pricing);
  if (running === undefined) return FULL_BAKE;
  const { operation, rules } = running;
  const current = { level: operation.bakePercent, profit: profitPerDayCents(business, pricing) };
  return rules.bakePercents
    .filter((level) => level !== operation.bakePercent)
    .reduce((best, level) => {
      const tried = withBakeLevel(business, { operation, bakePercent: level });
      const profit = profitPerDayCents(tried, pricing);
      return profit > best.profit ? { level, profit } : best;
    }, current).level;
}

export function startBakeryDay(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly day: number },
): OwnedBusiness {
  const unlocked = withBakeryUnlocked(business, start.pricing);
  const running = runningBakery(unlocked, start.pricing);
  if (running === undefined) return unlocked;
  const orders = running.operation.orders.filter((order) => order.endsDay > start.day);
  const baking = { ...unlocked, bakery: { ...running.operation, orders } };
  const managed = unlocked.staff.manager > 0 && unlocked.status === 'open';
  if (!managed) return baking;
  const bakePercent = bestBakeLevel(baking, start.pricing);
  return withBakeLevel(baking, { operation: baking.bakery, bakePercent });
}
