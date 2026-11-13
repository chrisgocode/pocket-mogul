import { profitPerDayCents, quoteBusinessDay } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import { bulkOfferDraw, bulkOrderFrom, openBulkOffer } from '@/domain/business/factory';
import {
  factoryRulesOf,
  runningFactory,
  type RunningFactory,
} from '@/domain/business/factoryDemand';
import { quoteAutomation, type AutomationQuote } from '@/domain/business/factoryQuotes';
import { PRODUCTS, type BulkOrder, type Product } from '@/domain/business/factoryRules';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const FACTORY_COACH_MARK: CoachMark = 'factory';

export type ProductView = {
  readonly product: Product;
  readonly pricePercent: number;
  readonly buyersPercent: number;
  readonly costPercent: number;
  readonly profitCents: MoneyCents;
};

export type BulkOrderView = {
  readonly client: string;
  readonly batchesPerDay: number;
  readonly rateCents: MoneyCents;
  readonly penaltyCents: MoneyCents;
  readonly daysLeft: number;
};

export type BulkOfferView = BulkOrderView & {
  readonly id: number;
  readonly profitChangeCents: MoneyCents;
};

export type BulkView = {
  readonly orders: readonly BulkOrderView[];
  readonly maxOrders: number;
  readonly due: number;
  readonly made: number;
  readonly offer: BulkOfferView | undefined;
};

export type AvailableAutomation = Extract<AutomationQuote, { status: 'available' }> & Affordability;
export type AutomationOption =
  | Exclude<AutomationQuote, { status: 'available' }>
  | AvailableAutomation;

export type FactoryView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly product: Product;
      readonly retoolDaysLeft: number;
      readonly products: readonly ProductView[];
      readonly bulk: BulkView;
      readonly coachMark: 'show' | 'seen';
      readonly automation: AutomationOption;
    };

type FactoryContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

type Making = FactoryContext & { readonly running: RunningFactory; readonly day: number };

function productViews(making: Making): ProductView[] {
  const { owned, pricing, running } = making;
  return PRODUCTS.map((product) => {
    const rule = running.rules.products[product];
    const tooled = { ...running.operation, product, retoolDaysLeft: 0 };
    return {
      product,
      pricePercent: rule.priceBps / BPS_PER_PERCENT,
      buyersPercent: rule.demandBps / BPS_PER_PERCENT,
      costPercent: rule.costBps / BPS_PER_PERCENT,
      profitCents: profitPerDayCents({ ...owned, factory: tooled }, pricing),
    };
  });
}

function orderView(order: BulkOrder, making: Making): BulkOrderView {
  const clients = making.running.rules.bulk.clients;
  return {
    client: clients.find((client) => client.id === order.clientId)?.name ?? order.clientId,
    batchesPerDay: order.parcelsPerDay,
    rateCents: order.rateCents,
    penaltyCents: order.penaltyCents,
    daysLeft: order.endsDay - making.day,
  };
}

function offerView(making: Making): BulkOfferView | undefined {
  const { owned, pricing, running, day } = making;
  const draw = bulkOfferDraw(owned, making);
  const offer = draw === undefined ? undefined : openBulkOffer(running, { draw, day });
  if (offer === undefined) return undefined;
  const { penaltyBps } = running.rules.bulk;
  const order = bulkOrderFrom(offer, { business: owned, pricing, penaltyBps, day });
  const orders = [...running.operation.orders, order];
  const taken = { ...owned, factory: { ...running.operation, orders } };
  return {
    ...orderView(order, making),
    id: offer.id,
    profitChangeCents: moneyCents(
      profitPerDayCents(taken, pricing) - profitPerDayCents(owned, pricing),
    ),
  };
}

function bulkView(making: Making): BulkView {
  const quote = quoteBusinessDay(making.owned, making.pricing);
  return {
    orders: making.running.operation.orders.map((order) => orderView(order, making)),
    maxOrders: making.running.rules.bulk.maxOrders,
    due: quote.contractParcels + quote.missedParcels,
    made: quote.contractParcels,
    offer: offerView(making),
  };
}

function automationOption(context: FactoryContext): AutomationOption {
  const quote = quoteAutomation(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectFactory(context: FactoryContext): FactoryView | undefined {
  const { owned, pricing } = context;
  const rules = factoryRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningFactory(owned, pricing);
  if (running === undefined) return { status: 'locked', unlockStage: rules.unlockStage };
  const making = { ...context, running, day: businessDayOf(context.simulationMs, pricing.rules) };
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    product: running.operation.product,
    retoolDaysLeft: running.operation.retoolDaysLeft,
    products: productViews(making),
    bulk: bulkView(making),
    coachMark: context.seenCoachMarks.includes(FACTORY_COACH_MARK) ? 'seen' : 'show',
    automation: automationOption(context),
  };
}
