import type { CommandResult, GameErrorCode } from './commands';
import type { GameState, OwnedProperty } from './gameState';
import { moneyCents, type MoneyCents } from './money';
import {
  levelZeroProperty,
  propertySaleProceedsCents,
  quotePropertyUpgrade,
  upgradedProperty,
  type PropertyCatalog,
  type PropertyDefinition,
  type PropertyRules,
  type PropertyTrack,
} from './propertyQuotes';

export type PropertyEconomy = {
  readonly catalog: PropertyCatalog;
  readonly rules: PropertyRules;
};

type PropertyOrder = { readonly propertyId: string; readonly economy: PropertyEconomy };

type OwnedLookup =
  | { readonly ok: true; readonly owned: OwnedProperty; readonly definition: PropertyDefinition }
  | { readonly ok: false; readonly error: GameErrorCode };

export function findProperty(
  catalog: PropertyCatalog,
  definitionId: string,
): PropertyDefinition | undefined {
  return catalog.find((definition) => definition.id === definitionId);
}

export function findOwnedProperty(
  state: GameState,
  definitionId: string,
): OwnedProperty | undefined {
  return state.properties.find((owned) => owned.definitionId === definitionId);
}

function lookUpOwned(state: GameState, order: PropertyOrder): OwnedLookup {
  const definition = findProperty(order.economy.catalog, order.propertyId);
  if (definition === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  const owned = findOwnedProperty(state, order.propertyId);
  if (owned === undefined) return { ok: false, error: 'NOT_OWNED' };
  return { ok: true, owned, definition };
}

function withProperty(state: GameState, property: OwnedProperty): GameState {
  return {
    ...state,
    properties: state.properties.map((owned) =>
      owned.definitionId === property.definitionId ? property : owned,
    ),
  };
}

function spend(state: GameState, priceCents: MoneyCents): CommandResult {
  if (state.cashCents < priceCents) return { ok: false, error: 'INSUFFICIENT_CASH' };
  return {
    ok: true,
    cashChangeCents: moneyCents(0n - priceCents),
    state: { ...state, cashCents: moneyCents(state.cashCents - priceCents) },
  };
}

export function applyBuyProperty(state: GameState, order: PropertyOrder): CommandResult {
  const definition = findProperty(order.economy.catalog, order.propertyId);
  if (definition === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  if (findOwnedProperty(state, definition.id) !== undefined) {
    return { ok: false, error: 'ALREADY_OWNED' };
  }
  const bought = levelZeroProperty(definition.id);
  return spend({ ...state, properties: [...state.properties, bought] }, definition.price);
}

export function applyUpgradeProperty(
  state: GameState,
  order: PropertyOrder & { readonly track: PropertyTrack; readonly fromLevel: number },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const quote = quotePropertyUpgrade(found.owned, {
    definition: found.definition,
    rules: order.economy.rules,
    track: order.track,
  });
  if (quote.level !== order.fromLevel) return { ok: false, error: 'STALE_QUOTE' };
  if (quote.status === 'unavailable') return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'max') return { ok: false, error: 'MAX_LEVEL' };
  const next = upgradedProperty(found.owned, { track: order.track, priceCents: quote.priceCents });
  return spend(withProperty(state, next), quote.priceCents);
}

export function applySetRentalStatus(
  state: GameState,
  order: PropertyOrder & { readonly rented: boolean },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  return {
    ok: true,
    cashChangeCents: moneyCents(0),
    state: withProperty(state, { ...found.owned, rented: order.rented }),
  };
}

export function applySellProperty(state: GameState, order: PropertyOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const proceedsCents = propertySaleProceedsCents(found.owned, {
    definition: found.definition,
    rules: order.economy.rules,
  });
  return {
    ok: true,
    cashChangeCents: proceedsCents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + proceedsCents),
      properties: state.properties.filter((owned) => owned !== found.owned),
    },
  };
}
