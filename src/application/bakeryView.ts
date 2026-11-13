import { offerDraw, openOffer, orderFrom, withBakeLevel } from '@/domain/business/bakery';
import {
  bakeryRulesOf,
  runningBakery,
  wholesaleFeeCents,
  type RunningBakery,
} from '@/domain/business/bakeryDemand';
import { quoteCentralKitchen, type CentralKitchenQuote } from '@/domain/business/bakeryQuotes';
import type { WholesaleOrder } from '@/domain/business/bakeryRules';
import { profitPerDayCents, quoteBusinessDay } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const BAKERY_COACH_MARK: CoachMark = 'bakery';

export type BakeLevelView = {
  readonly percent: number;
  readonly profitCents: MoneyCents;
  readonly best: boolean;
};

export type ShelfView = { readonly baked: number; readonly sold: number; readonly stale: number };

export type WholesaleOrderView = {
  readonly client: string;
  readonly ordersPerDay: number;
  readonly feeCents: MoneyCents;
  readonly daysLeft: number;
};

export type WholesaleOfferView = WholesaleOrderView & {
  readonly id: number;
  readonly pricePercent: number;
  readonly profitChangeCents: MoneyCents;
};

export type AvailableCentralKitchen = Extract<CentralKitchenQuote, { status: 'available' }> &
  Affordability;
export type CentralKitchenOption =
  | Exclude<CentralKitchenQuote, { status: 'available' }>
  | AvailableCentralKitchen;

export type BakeryView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly bakePercent: number;
      readonly bakeLevels: readonly BakeLevelView[];
      readonly shelf: ShelfView;
      readonly orders: readonly WholesaleOrderView[];
      readonly maxOrders: number;
      readonly offer: WholesaleOfferView | undefined;
      readonly coachMark: 'show' | 'seen';
      readonly centralKitchen: CentralKitchenOption;
    };

type BakeryContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

type Baking = BakeryContext & { readonly running: RunningBakery; readonly day: number };

function bakeLevels(baking: Baking): BakeLevelView[] {
  const { owned, pricing, running } = baking;
  const { operation, rules } = running;
  const profits = rules.bakePercents.map((bakePercent) =>
    profitPerDayCents(withBakeLevel(owned, { operation, bakePercent }), pricing),
  );
  const best = profits.reduce((top, profit) => (profit > top ? profit : top));
  return rules.bakePercents.map((percent, index) => ({
    percent,
    profitCents: profits[index] ?? best,
    best: profits[index] === best,
  }));
}

function orderView(order: WholesaleOrder, baking: Baking): WholesaleOrderView {
  const clients = baking.running.rules.wholesale.clients;
  return {
    client: clients.find((client) => client.id === order.clientId)?.name ?? order.clientId,
    ordersPerDay: order.ordersPerDay,
    feeCents: moneyCents(wholesaleFeeCents(order, baking.pricing)),
    daysLeft: order.endsDay - baking.day,
  };
}

function offerView(baking: Baking): WholesaleOfferView | undefined {
  const { owned, pricing, running, day } = baking;
  const draw = offerDraw(owned, baking);
  const offer = draw === undefined ? undefined : openOffer(running, { draw, day });
  if (offer === undefined) return undefined;
  const order = orderFrom(offer, { business: owned, pricing, day });
  const orders = [...running.operation.orders, order];
  const taken = { ...owned, bakery: { ...running.operation, orders } };
  return {
    ...orderView(order, baking),
    id: offer.id,
    pricePercent: offer.priceBps / BPS_PER_PERCENT,
    profitChangeCents: moneyCents(
      profitPerDayCents(taken, pricing) - profitPerDayCents(owned, pricing),
    ),
  };
}

function centralKitchenOption(context: BakeryContext): CentralKitchenOption {
  const quote = quoteCentralKitchen(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

function shelfView(context: BakeryContext): ShelfView {
  const quote = quoteBusinessDay(context.owned, context.pricing);
  return { baked: quote.capacity, sold: quote.served, stale: quote.capacity - quote.served };
}

export function selectBakery(context: BakeryContext): BakeryView | undefined {
  const { owned, pricing } = context;
  const rules = bakeryRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningBakery(owned, pricing);
  if (running === undefined) return { status: 'locked', unlockStage: rules.unlockStage };
  const day = businessDayOf(context.simulationMs, pricing.rules);
  const baking = { ...context, running, day };
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    bakePercent: running.operation.bakePercent,
    bakeLevels: bakeLevels(baking),
    shelf: shelfView(context),
    orders: running.operation.orders.map((order) => orderView(order, baking)),
    maxOrders: rules.wholesale.maxOrders,
    offer: offerView(baking),
    coachMark: context.seenCoachMarks.includes(BAKERY_COACH_MARK) ? 'seen' : 'show',
    centralKitchen: centralKitchenOption(context),
  };
}
