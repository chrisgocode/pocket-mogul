import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import type { MoneyCents } from '@/domain/money';

import { changed, lookUpOwned, type BusinessOrder } from './commands';
import { businessDayOf, type BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { rivalStanding, type RivalStanding } from './takeovers';

type TakeoverOrder = BusinessOrder & {
  readonly rivalId: string;
  readonly amountCents: MoneyCents;
};

const STANDING_ERRORS: Readonly<Record<RivalStanding, GameErrorCode | undefined>> = {
  unknown: 'UNKNOWN_ASSET',
  merged: 'UNKNOWN_ASSET',
  pending: 'OFFER_PENDING',
  waiting: 'OFFER_PENDING',
  locked: 'OFFER_LOCKED',
  open: undefined,
};

function offerRefusal(
  owned: OwnedBusiness,
  offer: { readonly order: TakeoverOrder; readonly pricing: BusinessPricing; readonly day: number },
): GameErrorCode | undefined {
  const { order, pricing, day } = offer;
  if (owned.stage < pricing.rules.takeovers.fromStage) return 'STAGE_LOCKED';
  const standing = STANDING_ERRORS[rivalStanding(owned, { pricing, rivalId: order.rivalId, day })];
  if (standing !== undefined) return standing;
  if (order.amountCents <= 0n) return 'INVALID_QUANTITY';
  if (owned.status === 'closed') return 'BUSINESS_CLOSED';
  return owned.treasuryCents < order.amountCents ? 'INSUFFICIENT_TREASURY' : undefined;
}

export function applyMakeTakeoverOffer(state: GameState, order: TakeoverOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const day = businessDayOf(state.clock.simulationMs, pricing.rules);
  const error = offerRefusal(owned, { order, pricing, day });
  if (error !== undefined) return { ok: false, error };
  const { rivalId, amountCents } = order;
  return changed(state, {
    ...owned,
    takeovers: { ...owned.takeovers, offer: { status: 'pending', rivalId, amountCents } },
  });
}
