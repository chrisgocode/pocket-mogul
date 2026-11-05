import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';

export type BusinessDefinition = {
  readonly id: string;
  readonly tier: number;
  readonly price: MoneyCents;
  readonly revenuePerMinute: MoneyCents;
  readonly costsPerMinute: MoneyCents;
};

export type BusinessCatalog = readonly BusinessDefinition[];

export function businessNetPerMinuteCents(definition: BusinessDefinition): MoneyCents {
  const net = definition.revenuePerMinute - definition.costsPerMinute;
  return moneyCents(net > 0n ? net : 0n);
}

export function findBusiness(
  catalog: BusinessCatalog,
  definitionId: string,
): BusinessDefinition | undefined {
  return catalog.find((definition) => definition.id === definitionId);
}

export function ownsBusiness(state: GameState, definitionId: string): boolean {
  return state.businesses.some((owned) => owned.definitionId === definitionId);
}

export function applyBuyBusiness(
  state: GameState,
  purchase: { businessId: string; catalog: BusinessCatalog },
): CommandResult {
  const definition = findBusiness(purchase.catalog, purchase.businessId);
  if (definition === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  if (ownsBusiness(state, definition.id)) return { ok: false, error: 'ALREADY_OWNED' };
  if (!state.unlockedTiers.includes(definition.tier)) return { ok: false, error: 'LOCKED_TIER' };
  if (state.cashCents < definition.price) return { ok: false, error: 'INSUFFICIENT_CASH' };
  return {
    ok: true,
    cashChangeCents: moneyCents(0n - definition.price),
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents - definition.price),
      businesses: [
        ...state.businesses,
        { definitionId: definition.id, capitalizedSpendCents: definition.price },
      ],
    },
  };
}
