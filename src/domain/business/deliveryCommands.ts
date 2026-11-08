import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { businessDayOf } from './definition';
import { deliveryRulesOf, runningDelivery, type RunningDelivery } from './deliveryDemand';
import { quoteSortingHub, withAcceptedContract } from './deliveryQuotes';
import type { ContractOffer } from './deliveryState';
import type { OwnedBusiness } from './owned';

type OfferOrder = BusinessOrder & { readonly offerId: string };

type OfferLookup =
  | {
      readonly ok: true;
      readonly owned: OwnedBusiness;
      readonly running: RunningDelivery;
      readonly offer: ContractOffer;
    }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpOffer(state: GameState, order: OfferOrder): OfferLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (deliveryRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningDelivery(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  const offer = running.operation.offers.find((each) => each.id === order.offerId);
  if (offer === undefined) return { ok: false, error: 'STALE_QUOTE' };
  return { ok: true, owned: found.owned, running, offer };
}

export function applyAcceptContract(state: GameState, order: OfferOrder): CommandResult {
  const found = lookUpOffer(state, order);
  if (!found.ok) return found;
  const day = businessDayOf(state.clock.simulationMs, order.economy.rules);
  return changed(state, withAcceptedContract(found.owned, { offer: found.offer, day }));
}

export function applyDeclineContract(state: GameState, order: OfferOrder): CommandResult {
  const found = lookUpOffer(state, order);
  if (!found.ok) return found;
  const { operation } = found.running;
  const offers = operation.offers.filter((offer) => offer.id !== order.offerId);
  return changed(state, { ...found.owned, delivery: { ...operation, offers } });
}

export function applyInstallSortingHub(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteSortingHub(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningDelivery(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, delivery: { ...running.operation, sortingHub: 'installed' } },
    expense: 'capital',
  });
}
