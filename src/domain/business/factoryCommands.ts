import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { businessDayOf, type BusinessPricing } from './definition';
import { bulkOfferDraw, bulkOrderFrom, openBulkOffer } from './factory';
import { factoryRulesOf, runningFactory, type RunningFactory } from './factoryDemand';
import { quoteAutomation } from './factoryQuotes';
import type { Product } from './factoryRules';
import type { OwnedBusiness } from './owned';

type FactoryLookup =
  | {
      readonly ok: true;
      readonly owned: OwnedBusiness;
      readonly pricing: BusinessPricing;
      readonly running: RunningFactory;
    }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpFactory(state: GameState, order: BusinessOrder): FactoryLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (factoryRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningFactory(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, pricing: found.pricing, running };
}

type ProductOrder = BusinessOrder & { readonly product: Product };

export function applySetProduct(state: GameState, order: ProductOrder): CommandResult {
  const found = lookUpFactory(state, order);
  if (!found.ok) return found;
  const { rules, operation } = found.running;
  if (order.product === operation.product) return { ok: false, error: 'INVALID_QUANTITY' };
  const retoolDaysLeft = rules.retoolDays + 1;
  const factory = { ...operation, product: order.product, retoolDaysLeft };
  return changed(state, { ...found.owned, factory });
}

type AnswerOrder = BusinessOrder & {
  readonly offerId: number;
  readonly answer: 'accept' | 'decline';
};

export function applyAnswerBulkOffer(state: GameState, order: AnswerOrder): CommandResult {
  const found = lookUpFactory(state, order);
  if (!found.ok) return found;
  const { owned, pricing, running } = found;
  const draw = bulkOfferDraw(owned, { pricing, seed: state.market.seed });
  const day = businessDayOf(state.clock.simulationMs, pricing.rules);
  const offer = draw === undefined ? undefined : openBulkOffer(running, { draw, day });
  if (offer?.id !== order.offerId) return { ok: false, error: 'STALE_QUOTE' };
  const answered = { ...running.operation, answeredOffer: offer.id };
  if (order.answer === 'decline') return changed(state, { ...owned, factory: answered });
  const { penaltyBps } = running.rules.bulk;
  const taken = bulkOrderFrom(offer, { business: owned, pricing, penaltyBps, day });
  return changed(state, {
    ...owned,
    factory: { ...answered, orders: [...answered.orders, taken] },
  });
}

export function applyInstallAutomation(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteAutomation(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningFactory(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, factory: { ...running.operation, automation: 'installed' } },
    expense: 'capital',
  });
}
