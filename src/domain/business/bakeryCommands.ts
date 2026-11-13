import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { offerDraw, openOffer, orderFrom } from './bakery';
import { bakeryRulesOf, runningBakery, type RunningBakery } from './bakeryDemand';
import { quoteCentralKitchen } from './bakeryQuotes';
import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { businessDayOf, type BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

type BakeryLookup =
  | {
      readonly ok: true;
      readonly owned: OwnedBusiness;
      readonly pricing: BusinessPricing;
      readonly running: RunningBakery;
    }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpBakery(state: GameState, order: BusinessOrder): BakeryLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (bakeryRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningBakery(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, pricing: found.pricing, running };
}

type BakeOrder = BusinessOrder & { readonly percent: number };

export function applySetBakeLevel(state: GameState, order: BakeOrder): CommandResult {
  const found = lookUpBakery(state, order);
  if (!found.ok) return found;
  const { rules, operation } = found.running;
  if (!rules.bakePercents.includes(order.percent)) {
    return { ok: false, error: 'INVALID_QUANTITY' };
  }
  return changed(state, { ...found.owned, bakery: { ...operation, bakePercent: order.percent } });
}

type AnswerOrder = BusinessOrder & {
  readonly offerId: number;
  readonly answer: 'accept' | 'decline';
};

export function applyAnswerWholesaleOffer(state: GameState, order: AnswerOrder): CommandResult {
  const found = lookUpBakery(state, order);
  if (!found.ok) return found;
  const { owned, pricing, running } = found;
  const draw = offerDraw(owned, { pricing, seed: state.market.seed });
  const day = businessDayOf(state.clock.simulationMs, pricing.rules);
  const offer = draw === undefined ? undefined : openOffer(running, { draw, day });
  if (offer?.id !== order.offerId) return { ok: false, error: 'STALE_QUOTE' };
  const answered = { ...running.operation, answeredOffer: offer.id };
  if (order.answer === 'decline') return changed(state, { ...owned, bakery: answered });
  const orders = [...answered.orders, orderFrom(offer, { business: owned, pricing, day })];
  return changed(state, { ...owned, bakery: { ...answered, orders } });
}

export function applyInstallCentralKitchen(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteCentralKitchen(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningBakery(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, bakery: { ...running.operation, centralKitchen: 'installed' } },
    expense: 'capital',
  });
}
