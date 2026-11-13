import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { businessDayOf, type BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { openPayloadOffer, payloadContractFrom, spaceDraw } from './space';
import { runningSpace, spaceRulesOf, type RunningSpace } from './spaceDemand';
import { quoteBoosters } from './spaceQuotes';
import type { Cadence } from './spaceRules';

type SpaceLookup =
  | {
      readonly ok: true;
      readonly owned: OwnedBusiness;
      readonly pricing: BusinessPricing;
      readonly running: RunningSpace;
    }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpSpace(state: GameState, order: BusinessOrder): SpaceLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (spaceRulesOf(found.pricing) === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  const running = runningSpace(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, pricing: found.pricing, running };
}

type CadenceOrder = BusinessOrder & { readonly cadence: Cadence };

export function applySetCadence(state: GameState, order: CadenceOrder): CommandResult {
  const found = lookUpSpace(state, order);
  if (!found.ok) return found;
  const space = { ...found.running.operation, cadence: order.cadence };
  return changed(state, { ...found.owned, space });
}

type AnswerOrder = BusinessOrder & {
  readonly offerId: number;
  readonly answer: 'accept' | 'decline';
};

export function applyAnswerPayloadOffer(state: GameState, order: AnswerOrder): CommandResult {
  const found = lookUpSpace(state, order);
  if (!found.ok) return found;
  const { owned, pricing, running } = found;
  const draw = spaceDraw(owned, { pricing, seed: state.market.seed });
  const day = businessDayOf(state.clock.simulationMs, pricing.rules);
  const offer = draw === undefined ? undefined : openPayloadOffer(running, { draw, day });
  if (offer?.id !== order.offerId) return { ok: false, error: 'STALE_QUOTE' };
  const answered = { ...running.operation, answeredOffer: offer.id };
  if (order.answer === 'decline') return changed(state, { ...owned, space: answered });
  const { penaltyBps } = running.rules.payloads;
  const taken = payloadContractFrom(offer, { business: owned, pricing, penaltyBps, day });
  const contracts = [...answered.contracts, taken];
  return changed(state, { ...owned, space: { ...answered, contracts } });
}

export function applyInstallBoosters(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteBoosters(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningSpace(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, space: { ...running.operation, boosters: 'installed' } },
    expense: 'capital',
  });
}
