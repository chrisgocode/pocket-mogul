import type { MoneyCents } from '@/domain/money';

export const COLLECTIBLE_CATEGORIES = [
  'art',
  'cars',
  'watches',
  'yachts',
  'wine',
  'curiosities',
] as const;
export type CollectibleCategory = (typeof COLLECTIBLE_CATEGORIES)[number];

export const RARITIES = ['common', 'uncommon', 'rare'] as const;
export type Rarity = (typeof RARITIES)[number];

export const SWING_SHAPES = ['smooth', 'step'] as const;
export type SwingShape = (typeof SWING_SHAPES)[number];

export type AgePoint = { readonly days: number; readonly bps: number };

export type CategoryRules = {
  readonly id: CollectibleCategory;
  readonly swingBps: number;
  readonly swingDays: number;
  readonly swing: SwingShape;
  readonly ageCurve: readonly AgePoint[];
};

export type CollectibleDefinition = {
  readonly id: string;
  readonly category: CollectibleCategory;
  readonly tier: number;
  readonly rarity: Rarity;
  readonly price: MoneyCents;
};

export type CollectionRules = {
  readonly dayMs: number;
  readonly lotCount: number;
  readonly lotDays: number;
  readonly saleReturnPercent: number;
  readonly rarityWeights: Readonly<Record<Rarity, number>>;
  readonly categories: readonly CategoryRules[];
};

export type CollectionEconomy = {
  readonly pieces: readonly CollectibleDefinition[];
  readonly rules: CollectionRules;
};

export type OwnedCollectible = {
  readonly pieceId: string;
  readonly acquiredDay: number;
  readonly paidCents: MoneyCents;
};

export type CollectionDay = { readonly seed: string; readonly day: number };

export function collectionDayOf(
  state: { readonly clock: { readonly simulationMs: number }; readonly market: { seed: string } },
  rules: CollectionRules,
): CollectionDay {
  return { seed: state.market.seed, day: Math.floor(state.clock.simulationMs / rules.dayMs) };
}
