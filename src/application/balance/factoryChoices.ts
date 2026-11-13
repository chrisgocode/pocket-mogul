import { profitPerDayCents } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import { bulkOfferDraw, bulkOrderFrom, openBulkOffer } from '@/domain/business/factory';
import { runningFactory } from '@/domain/business/factoryDemand';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';

type FactoryContext = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly atMs: number;
};

export function factoryCommands(owned: OwnedBusiness, context: FactoryContext): GameCommand[] {
  const { pricing } = context;
  const running = runningFactory(owned, pricing);
  const draw = bulkOfferDraw(owned, context);
  if (running === undefined || draw === undefined) return [];
  const day = businessDayOf(context.atMs, pricing.rules);
  const offer = openBulkOffer(running, { draw, day });
  if (offer === undefined) return [];
  const { penaltyBps } = running.rules.bulk;
  const order = bulkOrderFrom(offer, { business: owned, pricing, penaltyBps, day });
  const orders = [...running.operation.orders, order];
  const taken = { ...owned, factory: { ...running.operation, orders } };
  const pays = profitPerDayCents(taken, pricing) > profitPerDayCents(owned, pricing);
  return [
    {
      type: 'AnswerBulkOffer',
      businessId: owned.definitionId,
      offerId: offer.id,
      answer: pays ? 'accept' : 'decline',
    },
  ];
}
