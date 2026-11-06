import {
  managerPriceCents,
  quoteBusinessUpgrade,
  saleProceedsCents,
  levelZeroBusiness,
  type BusinessCatalog,
  type BusinessDefinition,
  type BusinessRules,
  type UpgradeTrack,
} from './businessQuotes';
import type { CommandResult, GameErrorCode } from './commands';
import type { GameState, OwnedBusiness } from './gameState';
import { moneyCents } from './money';
import { spend } from './pricing';

export type BusinessEconomy = {
  readonly catalog: BusinessCatalog;
  readonly rules: BusinessRules;
};

type BusinessOrder = { readonly businessId: string; readonly economy: BusinessEconomy };

type OwnedLookup =
  | { readonly ok: true; readonly owned: OwnedBusiness; readonly definition: BusinessDefinition }
  | { readonly ok: false; readonly error: GameErrorCode };

export function findBusiness(
  catalog: BusinessCatalog,
  definitionId: string,
): BusinessDefinition | undefined {
  return catalog.find((definition) => definition.id === definitionId);
}

export function findOwnedBusiness(
  state: GameState,
  definitionId: string,
): OwnedBusiness | undefined {
  return state.businesses.find((owned) => owned.definitionId === definitionId);
}

function lookUpOwned(state: GameState, order: BusinessOrder): OwnedLookup {
  const definition = findBusiness(order.economy.catalog, order.businessId);
  if (definition === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  const owned = findOwnedBusiness(state, order.businessId);
  if (owned === undefined) return { ok: false, error: 'NOT_OWNED' };
  return { ok: true, owned, definition };
}

function withBusiness(state: GameState, business: OwnedBusiness): GameState {
  return {
    ...state,
    businesses: state.businesses.map((owned) =>
      owned.definitionId === business.definitionId ? business : owned,
    ),
  };
}

export function applyBuyBusiness(state: GameState, order: BusinessOrder): CommandResult {
  const definition = findBusiness(order.economy.catalog, order.businessId);
  if (definition === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  if (findOwnedBusiness(state, definition.id) !== undefined) {
    return { ok: false, error: 'ALREADY_OWNED' };
  }
  if (!state.unlockedTiers.includes(definition.tier)) return { ok: false, error: 'LOCKED_TIER' };
  const bought = { ...levelZeroBusiness(definition.id), capitalizedSpendCents: definition.price };
  return spend({ ...state, businesses: [...state.businesses, bought] }, definition.price);
}

export function applyUpgradeBusiness(
  state: GameState,
  order: BusinessOrder & { readonly track: UpgradeTrack; readonly fromLevel: number },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, definition } = found;
  const quote = quoteBusinessUpgrade(owned, {
    definition,
    rules: order.economy.rules,
    track: order.track,
  });
  if (quote.level !== order.fromLevel) return { ok: false, error: 'STALE_QUOTE' };
  if (quote.status === 'max') return { ok: false, error: 'MAX_LEVEL' };
  return spend(
    withBusiness(state, {
      ...owned,
      levels: { ...owned.levels, [order.track]: quote.level + 1 },
      capitalizedSpendCents: moneyCents(owned.capitalizedSpendCents + quote.priceCents),
    }),
    quote.priceCents,
  );
}

export function applyHireManager(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (found.owned.managerOwned) return { ok: false, error: 'ALREADY_OWNED' };
  return spend(
    withBusiness(state, { ...found.owned, managerOwned: true }),
    managerPriceCents({ definition: found.definition, rules: order.economy.rules }),
  );
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
