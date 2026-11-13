import { bestBakeLevel, offerDraw, openOffer, orderFrom } from '@/domain/business/bakery';
import { runningBakery } from '@/domain/business/bakeryDemand';
import { profitPerDayCents } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';

type BakeryContext = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly atMs: number;
};

function offerCommand(owned: OwnedBusiness, context: BakeryContext): GameCommand[] {
  const { pricing } = context;
  const running = runningBakery(owned, pricing);
  const draw = offerDraw(owned, context);
  if (running === undefined || draw === undefined) return [];
  const day = businessDayOf(context.atMs, pricing.rules);
  const offer = openOffer(running, { draw, day });
  if (offer === undefined) return [];
  const order = orderFrom(offer, { business: owned, pricing, day });
  const orders = [...running.operation.orders, order];
  const taken = { ...owned, bakery: { ...running.operation, orders } };
  const pays = profitPerDayCents(taken, pricing) > profitPerDayCents(owned, pricing);
  return [
    {
      type: 'AnswerWholesaleOffer',
      businessId: owned.definitionId,
      offerId: offer.id,
      answer: pays ? 'accept' : 'decline',
    },
  ];
}

export function bakeryCommands(owned: OwnedBusiness, context: BakeryContext): GameCommand[] {
  const running = runningBakery(owned, context.pricing);
  if (running === undefined) return [];
  const percent = bestBakeLevel(owned, context.pricing);
  const bake: GameCommand[] =
    percent === running.operation.bakePercent
      ? []
      : [{ type: 'SetBakeLevel', businessId: owned.definitionId, percent }];
  return [...offerCommand(owned, context), ...bake];
}
