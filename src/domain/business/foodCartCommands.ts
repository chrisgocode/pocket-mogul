import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { foodCartRulesOf, runningFoodCart, type RunningFoodCart } from './foodCartDemand';
import { quoteSecondWindow } from './foodCartQuotes';
import type { CartSpot, MenuItem } from './foodCartRules';
import type { ActiveFoodCart } from './foodCartState';
import type { OwnedBusiness } from './owned';

type FoodCartLookup =
  | { readonly ok: true; readonly owned: OwnedBusiness; readonly running: RunningFoodCart }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpFoodCart(state: GameState, order: BusinessOrder): FoodCartLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (foodCartRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningFoodCart(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, running };
}

function withFoodCart(
  state: GameState,
  found: { readonly owned: OwnedBusiness; readonly foodCart: ActiveFoodCart },
): CommandResult {
  return changed(state, { ...found.owned, foodCart: found.foodCart });
}

type SpotOrder = BusinessOrder & { readonly spot: CartSpot };

export function applySetCartSpot(state: GameState, order: SpotOrder): CommandResult {
  const found = lookUpFoodCart(state, order);
  if (!found.ok) return found;
  const foodCart = { ...found.running.operation, spot: order.spot };
  return withFoodCart(state, { owned: found.owned, foodCart });
}

type MenuOrder = BusinessOrder & { readonly item: MenuItem; readonly offered: boolean };

export function applySetMenuItem(state: GameState, order: MenuOrder): CommandResult {
  const found = lookUpFoodCart(state, order);
  if (!found.ok) return found;
  const { operation } = found.running;
  const offer = order.offered ? 'offered' : 'withdrawn';
  const menu = { ...operation.menu, [order.item]: offer };
  return withFoodCart(state, { owned: found.owned, foodCart: { ...operation, menu } });
}

export function applyInstallSecondWindow(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteSecondWindow(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningFoodCart(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, foodCart: { ...running.operation, secondWindow: 'installed' } },
    expense: 'capital',
  });
}
