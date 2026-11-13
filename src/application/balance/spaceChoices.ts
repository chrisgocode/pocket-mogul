import { profitPerDayCents } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import {
  bestCadence,
  openPayloadOffer,
  payloadContractFrom,
  spaceDraw,
} from '@/domain/business/space';
import { runningSpace } from '@/domain/business/spaceDemand';
import type { GameCommand } from '@/domain/commands';

type SpaceContext = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly atMs: number;
};

function offerCommand(owned: OwnedBusiness, context: SpaceContext): GameCommand[] {
  const { pricing } = context;
  const running = runningSpace(owned, pricing);
  const draw = spaceDraw(owned, context);
  if (running === undefined || draw === undefined) return [];
  const day = businessDayOf(context.atMs, pricing.rules);
  const offer = openPayloadOffer(running, { draw, day });
  if (offer === undefined) return [];
  const { penaltyBps } = running.rules.payloads;
  const contract = payloadContractFrom(offer, { business: owned, pricing, penaltyBps, day });
  const contracts = [...running.operation.contracts, contract];
  const taken = { ...owned, space: { ...running.operation, contracts } };
  const pays = profitPerDayCents(taken, pricing) > profitPerDayCents(owned, pricing);
  return [
    {
      type: 'AnswerPayloadOffer',
      businessId: owned.definitionId,
      offerId: offer.id,
      answer: pays ? 'accept' : 'decline',
    },
  ];
}

export function spaceCommands(owned: OwnedBusiness, context: SpaceContext): GameCommand[] {
  const running = runningSpace(owned, context.pricing);
  if (running === undefined) return [];
  const cadence = bestCadence(owned, context.pricing);
  const pace: GameCommand[] =
    cadence === running.operation.cadence
      ? []
      : [{ type: 'SetCadence', businessId: owned.definitionId, cadence }];
  return [...pace, ...offerCommand(owned, context)];
}
