import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { laundromatRulesOf, runningLaundromat, type RunningLaundromat } from './laundromatDemand';
import { quotePickup } from './laundromatQuotes';
import type { OwnedBusiness } from './owned';

type LaundromatLookup =
  | { readonly ok: true; readonly owned: OwnedBusiness; readonly running: RunningLaundromat }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpLaundromat(state: GameState, order: BusinessOrder): LaundromatLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (laundromatRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningLaundromat(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, running };
}

type JumboOrder = BusinessOrder & { readonly percent: number };

export function applySetJumboShare(state: GameState, order: JumboOrder): CommandResult {
  const found = lookUpLaundromat(state, order);
  if (!found.ok) return found;
  const { rules, operation } = found.running;
  if (!rules.jumbo.sharePercents.includes(order.percent)) {
    return { ok: false, error: 'INVALID_QUANTITY' };
  }
  const laundromat = { ...operation, jumboPercent: order.percent };
  return changed(state, { ...found.owned, laundromat });
}

type ServiceOrder = BusinessOrder & { readonly level: number };

export function applySetServiceLevel(state: GameState, order: ServiceOrder): CommandResult {
  const found = lookUpLaundromat(state, order);
  if (!found.ok) return found;
  const { rules, operation } = found.running;
  const { level } = order;
  const known =
    Number.isInteger(level) && level >= 0 && level <= rules.service.priceBpsByLevel.length;
  if (!known) return { ok: false, error: 'INVALID_QUANTITY' };
  if (level > found.owned.staff.operations) return { ok: false, error: 'AT_CAP' };
  return changed(state, { ...found.owned, laundromat: { ...operation, serviceLevel: level } });
}

export function applyInstallPickup(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quotePickup(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningLaundromat(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, laundromat: { ...running.operation, pickup: 'installed' } },
    expense: 'capital',
  });
}
