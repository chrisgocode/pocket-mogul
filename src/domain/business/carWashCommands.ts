import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { carWashRulesOf, runningCarWash, type RunningCarWash } from './carWashDemand';
import { quoteDetailing } from './carWashQuotes';
import type { OptionalPackage } from './carWashRules';
import type { ActiveCarWash } from './carWashState';
import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import type { PriceLevel } from './definition';
import type { OwnedBusiness } from './owned';

type CarWashLookup =
  | { readonly ok: true; readonly owned: OwnedBusiness; readonly running: RunningCarWash }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpCarWash(state: GameState, order: BusinessOrder): CarWashLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (carWashRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningCarWash(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, running };
}

function withCarWash(
  state: GameState,
  found: { readonly owned: OwnedBusiness; readonly carWash: ActiveCarWash },
): CommandResult {
  return changed(state, { ...found.owned, carWash: found.carWash });
}

type PackageOrder = BusinessOrder & {
  readonly washPackage: OptionalPackage;
  readonly offered: boolean;
};

export function applySetWashPackage(state: GameState, order: PackageOrder): CommandResult {
  const found = lookUpCarWash(state, order);
  if (!found.ok) return found;
  const { operation } = found.running;
  const offer = order.offered ? 'offered' : 'withdrawn';
  const packages = { ...operation.packages, [order.washPackage]: offer };
  return withCarWash(state, { owned: found.owned, carWash: { ...operation, packages } });
}

type MembershipPriceOrder = BusinessOrder & { readonly priceLevel: PriceLevel };

export function applySetMembershipPrice(
  state: GameState,
  order: MembershipPriceOrder,
): CommandResult {
  const found = lookUpCarWash(state, order);
  if (!found.ok) return found;
  const carWash = { ...found.running.operation, membershipLevel: order.priceLevel };
  return withCarWash(state, { owned: found.owned, carWash });
}

type MemberCapOrder = BusinessOrder & { readonly capPercent: number };

export function applySetMemberCap(state: GameState, order: MemberCapOrder): CommandResult {
  const found = lookUpCarWash(state, order);
  if (!found.ok) return found;
  const { rules, operation } = found.running;
  const { capStepPercent, maxCapPercent } = rules.memberships;
  const { capPercent } = order;
  const onStep = Number.isInteger(capPercent) && capPercent % capStepPercent === 0;
  if (!onStep || capPercent < 0 || capPercent > maxCapPercent) {
    return { ok: false, error: 'INVALID_QUANTITY' };
  }
  const carWash = { ...operation, memberCapPercent: capPercent };
  return withCarWash(state, { owned: found.owned, carWash });
}

export function applyInstallDetailing(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteDetailing(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningCarWash(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, carWash: { ...running.operation, detailing: 'installed' } },
    expense: 'capital',
  });
}
