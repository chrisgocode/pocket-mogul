import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { gymRulesOf, runningGym, type RunningGym } from './gymDemand';
import { quoteAllHours } from './gymQuotes';
import type { GymTier } from './gymRules';
import type { OwnedBusiness } from './owned';

type GymLookup =
  | { readonly ok: true; readonly owned: OwnedBusiness; readonly running: RunningGym }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpGym(state: GameState, order: BusinessOrder): GymLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (gymRulesOf(found.pricing) === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  const running = runningGym(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, running };
}

type TierOrder = BusinessOrder & { readonly tier: GymTier };

export function applySetGymTier(state: GameState, order: TierOrder): CommandResult {
  const found = lookUpGym(state, order);
  if (!found.ok) return found;
  return changed(state, { ...found.owned, gym: { ...found.running.operation, tier: order.tier } });
}

type ClassOrder = BusinessOrder & { readonly level: number };

export function applySetClassLevel(state: GameState, order: ClassOrder): CommandResult {
  const found = lookUpGym(state, order);
  if (!found.ok) return found;
  const { rules, operation } = found.running;
  const { level } = order;
  if (!Number.isInteger(level) || level < 0 || level > rules.classes.maxLevel) {
    return { ok: false, error: 'INVALID_QUANTITY' };
  }
  return changed(state, { ...found.owned, gym: { ...operation, classLevel: level } });
}

export function applyInstallAllHours(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteAllHours(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningGym(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, gym: { ...running.operation, allHours: 'installed' } },
    expense: 'capital',
  });
}
