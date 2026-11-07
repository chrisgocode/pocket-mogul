import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import type { OwnedBusiness } from './owned';
import { restockCents, restockSpots, withSpots } from './vending';
import { runningVending, vendingRulesOf, type RunningVending } from './vendingDemand';
import { quoteCardReaders } from './vendingQuotes';
import { VENDING_LOCATIONS, type StockMix, type VendingLocation } from './vendingRules';

type VendingLookup =
  | { readonly ok: true; readonly owned: OwnedBusiness; readonly running: RunningVending }
  | { readonly ok: false; readonly error: GameErrorCode };

function lookUpVending(state: GameState, order: BusinessOrder): VendingLookup {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (vendingRulesOf(found.pricing) === undefined) {
    return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  }
  const running = runningVending(found.owned, found.pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return { ok: true, owned: found.owned, running };
}

type MoveOrder = BusinessOrder & { readonly from: VendingLocation; readonly to: VendingLocation };

export function applyMoveVendingMachine(state: GameState, order: MoveOrder): CommandResult {
  const found = lookUpVending(state, order);
  if (!found.ok) return found;
  const { rules, operation } = found.running;
  const source = operation.spots[order.from];
  const target = operation.spots[order.to];
  if (order.from === order.to || source.machines === 0) {
    return { ok: false, error: 'INVALID_QUANTITY' };
  }
  if (target.machines >= rules.locations[order.to].slots) return { ok: false, error: 'AT_CAP' };
  const carried = Math.floor(source.stock / source.machines);
  const spots = {
    ...operation.spots,
    [order.from]: { ...source, machines: source.machines - 1, stock: source.stock - carried },
    [order.to]: { ...target, machines: target.machines + 1, stock: target.stock + carried },
  };
  return changed(state, withSpots(found.owned, { operation, spots }));
}

type MixOrder = BusinessOrder & { readonly location: VendingLocation; readonly mix: StockMix };

export function applySetVendingMix(state: GameState, order: MixOrder): CommandResult {
  const found = lookUpVending(state, order);
  if (!found.ok) return found;
  const { operation } = found.running;
  const spot = { ...operation.spots[order.location], mix: order.mix };
  const spots = { ...operation.spots, [order.location]: spot };
  return changed(state, withSpots(found.owned, { operation, spots }));
}

export type RestockTarget = VendingLocation | 'all';

type RestockOrder = BusinessOrder & { readonly location: RestockTarget };

const restockedLocations = (target: RestockTarget): readonly VendingLocation[] =>
  target === 'all' ? VENDING_LOCATIONS : [target];

export function restockTotalCents(running: RunningVending, target: RestockTarget): bigint {
  return restockedLocations(target).reduce<bigint>(
    (total, location) =>
      total + restockCents(running.rules, { location, spot: running.operation.spots[location] }),
    0n,
  );
}

export function applyRestockVending(state: GameState, order: RestockOrder): CommandResult {
  const found = lookUpVending(state, order);
  if (!found.ok) return found;
  const { running, owned } = found;
  const totalCents = restockTotalCents(running, order.location);
  if (totalCents === 0n) return { ok: false, error: 'INVALID_QUANTITY' };
  const locations = restockedLocations(order.location);
  const restocking = restockSpots(running, { locations, budgetCents: totalCents });
  return spendTreasury(state, {
    owned,
    priceCents: moneyCents(restocking.spentCents),
    improved: withSpots(owned, { operation: running.operation, spots: restocking.spots }),
    expense: 'operating',
  });
}

export function applyInstallCardReaders(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteCardReaders(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningVending(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, vending: { ...running.operation, cardReaders: 'installed' } },
    expense: 'capital',
  });
}
