import type {
  CollectionEconomy,
  CollectionMeasure,
  CollectionSet,
  OwnedCollectible,
  PerkKind,
} from './rules';

type Held = readonly OwnedCollectible[];

const holds = (held: Held, pieceId: string) => held.some((owned) => owned.pieceId === pieceId);

function piecesHeldOf(set: CollectionSet, held: Held): number {
  return set.pieceIds.filter((pieceId) => holds(held, pieceId)).length;
}

function completedSets(held: Held, economy: CollectionEconomy): CollectionSet[] {
  return economy.sets.filter((set) => piecesHeldOf(set, held) === set.pieceIds.length);
}

export function passPieceIds(economy: CollectionEconomy): readonly string[] {
  return economy.sets.filter((set) => set.access === 'pass').flatMap((set) => set.pieceIds);
}

export function perkPercent(
  held: Held,
  perk: { readonly economy: CollectionEconomy; readonly kind: PerkKind },
): number {
  const earned = completedSets(held, perk.economy)
    .filter((set) => set.perk.kind === perk.kind)
    .reduce((total, set) => total + set.perk.percent, 0);
  return Math.min(earned, perk.economy.rules.perkCaps[perk.kind]);
}

export function saleReturnPercent(held: Held, economy: CollectionEconomy): number {
  return economy.rules.saleReturnPercent + perkPercent(held, { economy, kind: 'resale' });
}

const MEASURES: Readonly<
  Record<CollectionMeasure, (held: Held, economy: CollectionEconomy) => number>
> = {
  pieces: (held, economy) => economy.pieces.filter((piece) => holds(held, piece.id)).length,
  sets: (held, economy) =>
    completedSets(held, economy).filter((set) => set.access === 'open').length,
  categories: (held, economy) =>
    new Set(economy.pieces.filter((piece) => holds(held, piece.id)).map((piece) => piece.category))
      .size,
};

export function collectionProgress(
  held: Held,
  progress: { readonly economy: CollectionEconomy; readonly measure: CollectionMeasure },
): number {
  return MEASURES[progress.measure](held, progress.economy);
}
