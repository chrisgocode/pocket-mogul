import type { GameState } from './gameState';

export const HELD_ENTITLEMENTS = [
  'removeAds',
  'vipPass',
  'goldenWallet',
  'nightManager',
  'founder',
  'collectorsPass',
] as const;

export const ENTITLEMENTS = ['taxExemption', ...HELD_ENTITLEMENTS] as const;

export type Entitlement = (typeof ENTITLEMENTS)[number];

export type HeldEntitlement = (typeof HELD_ENTITLEMENTS)[number];

export type Entitlements = Readonly<Partial<Record<HeldEntitlement, readonly string[]>>>;

export const NO_ENTITLEMENTS: Entitlements = {};

type Source = { readonly entitlement: HeldEntitlement; readonly sourceId: string };

export function holdsEntitlement(state: GameState, entitlement: Entitlement): boolean {
  if (entitlement === 'taxExemption') return state.tax.status === 'exempt';
  return (state.entitlements[entitlement] ?? []).length > 0;
}

export function withEntitlementSource(state: GameState, source: Source): GameState {
  const sources = state.entitlements[source.entitlement] ?? [];
  if (sources.includes(source.sourceId)) return state;
  return {
    ...state,
    entitlements: { ...state.entitlements, [source.entitlement]: [...sources, source.sourceId] },
  };
}

export function withoutEntitlementSource(state: GameState, source: Source): GameState {
  const sources = state.entitlements[source.entitlement] ?? [];
  if (!sources.includes(source.sourceId)) return state;
  const left = sources.filter((id) => id !== source.sourceId);
  const others = Object.fromEntries(
    Object.entries(state.entitlements).filter(([held]) => held !== source.entitlement),
  );
  return {
    ...state,
    entitlements: left.length > 0 ? { ...others, [source.entitlement]: left } : others,
  };
}
