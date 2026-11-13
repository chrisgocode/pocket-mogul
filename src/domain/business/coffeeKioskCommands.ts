import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import {
  coffeeKioskRulesOf,
  runningCoffeeKiosk,
  type RunningCoffeeKiosk,
} from './coffeeKioskDemand';
import { quoteOrderAhead } from './coffeeKioskQuotes';
import type { BeanGrade, RushPlan } from './coffeeKioskRules';
import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import type { OwnedBusiness } from './owned';

type CoffeeKioskLookup =
  | { readonly ok: true; readonly owned: OwnedBusiness; readonly running: RunningCoffeeKiosk }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpCoffeeKiosk(state: GameState, order: BusinessOrder): CoffeeKioskLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (coffeeKioskRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningCoffeeKiosk(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, running };
}

type GradeOrder = BusinessOrder & { readonly grade: BeanGrade };

export function applySetBeanGrade(state: GameState, order: GradeOrder): CommandResult {
  const found = lookUpCoffeeKiosk(state, order);
  if (!found.ok) return found;
  const coffeeKiosk = { ...found.running.operation, grade: order.grade };
  return changed(state, { ...found.owned, coffeeKiosk });
}

type PlanOrder = BusinessOrder & { readonly plan: RushPlan };

export function applySetRushPlan(state: GameState, order: PlanOrder): CommandResult {
  const found = lookUpCoffeeKiosk(state, order);
  if (!found.ok) return found;
  const coffeeKiosk = { ...found.running.operation, plan: order.plan };
  return changed(state, { ...found.owned, coffeeKiosk });
}

export function applyInstallOrderAhead(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteOrderAhead(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningCoffeeKiosk(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, coffeeKiosk: { ...running.operation, orderAhead: 'installed' } },
    expense: 'capital',
  });
}
