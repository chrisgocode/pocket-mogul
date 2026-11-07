import type { CommandResult, GameErrorCode } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { spend } from '@/domain/pricing';

import { quoteImprovement, quoteUnit, saleProceedsCents } from './core';
import {
  findBusiness,
  type BusinessDefinition,
  type BusinessEconomy,
  type BusinessPricing,
  type BusinessTrack,
  type PriceLevel,
} from './definition';
import { newBusiness, type OwnedBusiness } from './owned';
import { withVendingUnlocked } from './vending';

export type BusinessOrder = { readonly businessId: string; readonly economy: BusinessEconomy };

type Found = {
  readonly owned: OwnedBusiness;
  readonly definition: BusinessDefinition;
  readonly pricing: BusinessPricing;
};

type OwnedLookup =
  | ({ readonly ok: true } & Found)
  | { readonly ok: false; readonly error: GameErrorCode };

const NO_CASH_CHANGE = moneyCents(0);
const WHOLE_PERCENT = 100;

export function findOwnedBusiness(
  state: GameState,
  definitionId: string,
): OwnedBusiness | undefined {
  return state.businesses.find((owned) => owned.definitionId === definitionId);
}

export function lookUpOwned(state: GameState, order: BusinessOrder): OwnedLookup {
  const definition = findBusiness(order.economy.catalog, order.businessId);
  if (definition === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  const owned = findOwnedBusiness(state, order.businessId);
  if (owned === undefined) return { ok: false, error: 'NOT_OWNED' };
  return { ok: true, owned, definition, pricing: { definition, rules: order.economy.rules } };
}

function withBusiness(state: GameState, business: OwnedBusiness): GameState {
  return {
    ...state,
    businesses: state.businesses.map((owned) =>
      owned.definitionId === business.definitionId ? business : owned,
    ),
  };
}

export function changed(state: GameState, business: OwnedBusiness): CommandResult {
  return { ok: true, state: withBusiness(state, business), cashChangeCents: NO_CASH_CHANGE };
}

export type TreasurySpending = {
  readonly owned: OwnedBusiness;
  readonly priceCents: MoneyCents;
  readonly improved: OwnedBusiness;
  readonly expense: 'capital' | 'operating';
};

export function spendTreasury(state: GameState, spending: TreasurySpending): CommandResult {
  const { owned, priceCents, improved } = spending;
  if (owned.status === 'closed') return { ok: false, error: 'BUSINESS_CLOSED' };
  if (owned.treasuryCents < priceCents) return { ok: false, error: 'INSUFFICIENT_TREASURY' };
  const capitalizedCents = spending.expense === 'capital' ? priceCents : 0n;
  return changed(state, {
    ...improved,
    treasuryCents: moneyCents(owned.treasuryCents - priceCents),
    capitalizedSpendCents: moneyCents(owned.capitalizedSpendCents + capitalizedCents),
  });
}

export function applyBuyBusiness(state: GameState, order: BusinessOrder): CommandResult {
  const definition = findBusiness(order.economy.catalog, order.businessId);
  if (definition === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  if (findOwnedBusiness(state, definition.id) !== undefined) {
    return { ok: false, error: 'ALREADY_OWNED' };
  }
  if (!state.unlockedTiers.includes(definition.tier)) return { ok: false, error: 'LOCKED_TIER' };
  const bought = newBusiness(definition, {
    rules: order.economy.rules,
    atMs: state.clock.simulationMs,
  });
  const businesses = [...state.businesses, bought];
  return spend({ ...state, businesses, tradingUnlocked: true }, definition.price);
}

export function applyBuyUnit(
  state: GameState,
  order: BusinessOrder & { readonly fromUnits: number },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const quote = quoteUnit(found.owned, found.pricing);
  if (quote.units !== order.fromUnits) return { ok: false, error: 'STALE_QUOTE' };
  if (quote.status === 'at_cap') return { ok: false, error: 'AT_CAP' };
  return spendTreasury(state, {
    owned: found.owned,
    priceCents: quote.priceCents,
    improved: withVendingUnlocked({ ...found.owned, units: quote.units + 1 }, found.pricing),
    expense: 'capital',
  });
}

export function applyImproveBusiness(
  state: GameState,
  order: BusinessOrder & { readonly track: BusinessTrack; readonly fromLevel: number },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteImprovement(owned, { ...pricing, track: order.track });
  if (quote.level !== order.fromLevel) return { ok: false, error: 'STALE_QUOTE' };
  if (quote.status === 'max') return { ok: false, error: 'MAX_LEVEL' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, levels: { ...owned.levels, [order.track]: quote.level + 1 } },
    expense: 'capital',
  });
}

export function applySetPriceLevel(
  state: GameState,
  order: BusinessOrder & { readonly priceLevel: PriceLevel },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  return changed(state, { ...found.owned, priceLevel: order.priceLevel });
}

export function applySetPayout(
  state: GameState,
  order: BusinessOrder & { readonly payoutPercent: number },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { payoutPercent } = order;
  const onStep = payoutPercent % order.economy.rules.payoutStepPercent === 0;
  if (!onStep || payoutPercent < 0 || payoutPercent > WHOLE_PERCENT) {
    return { ok: false, error: 'INVALID_QUANTITY' };
  }
  return changed(state, { ...found.owned, payoutPercent });
}

export function applyDepositToTreasury(
  state: GameState,
  order: BusinessOrder & { readonly amountCents: MoneyCents },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned } = found;
  const deposited: OwnedBusiness = {
    ...owned,
    status: 'open',
    treasuryCents: moneyCents(owned.treasuryCents + order.amountCents),
  };
  return spend(withBusiness(state, deposited), order.amountCents);
}

export function applyWithdrawFromTreasury(
  state: GameState,
  order: BusinessOrder & { readonly amountCents: MoneyCents },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned } = found;
  if (owned.treasuryCents < order.amountCents) return { ok: false, error: 'INSUFFICIENT_TREASURY' };
  return {
    ok: true,
    cashChangeCents: order.amountCents,
    state: {
      ...withBusiness(state, {
        ...owned,
        treasuryCents: moneyCents(owned.treasuryCents - order.amountCents),
      }),
      cashCents: moneyCents(state.cashCents + order.amountCents),
    },
  };
}

export function applySellBusiness(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const proceedsCents = saleProceedsCents(found.owned, order.economy.rules);
  return {
    ok: true,
    cashChangeCents: proceedsCents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + proceedsCents),
      businesses: state.businesses.filter((owned) => owned !== found.owned),
    },
  };
}
