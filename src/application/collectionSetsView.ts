import type { Content } from '@/content';
import type { OwnedCollectible, PerkKind } from '@/domain/collection/rules';
import { perkPercent } from '@/domain/collection/sets';
import type { GameState } from '@/domain/gameState';

import { collectionEconomy } from './economy';

type SetContent = Content['collection']['sets'][number];

export type CollectionSetView = {
  readonly id: string;
  readonly name: string;
  readonly categoryName: string;
  readonly perk: { readonly kind: PerkKind; readonly percent: number };
  readonly status: 'complete' | 'open';
  readonly heldCount: number;
  readonly pieceCount: number;
  readonly missing: readonly string[];
};

export type CollectionSetsView = {
  readonly sets: readonly CollectionSetView[];
  readonly completedCount: number;
  readonly tapBonusPercent: number;
  readonly resaleBonusPercent: number;
};

function setView(
  set: SetContent,
  held: readonly OwnedCollectible[],
  content: Content,
): CollectionSetView {
  const { pieces, categories } = content.collection;
  const missing = set.pieceIds.filter(
    (pieceId) => !held.some((owned) => owned.pieceId === pieceId),
  );
  return {
    id: set.id,
    name: set.name,
    categoryName: categories.find((each) => each.id === set.category)?.name ?? set.category,
    perk: set.perk,
    status: missing.length === 0 ? 'complete' : 'open',
    heldCount: set.pieceIds.length - missing.length,
    pieceCount: set.pieceIds.length,
    missing: missing.map((pieceId) => pieces.find((each) => each.id === pieceId)?.name ?? pieceId),
  };
}

export function tapBonusPercent(state: GameState, content: Content): number {
  return perkPercent(state.collectibles, { economy: collectionEconomy(content), kind: 'tap' });
}

export function selectCollectionSets(state: GameState, content: Content): CollectionSetsView {
  const sets = content.collection.sets.map((set) => setView(set, state.collectibles, content));
  const economy = collectionEconomy(content);
  return {
    sets,
    completedCount: sets.filter((set) => set.status === 'complete').length,
    tapBonusPercent: perkPercent(state.collectibles, { economy, kind: 'tap' }),
    resaleBonusPercent: perkPercent(state.collectibles, { economy, kind: 'resale' }),
  };
}

export type ShelfView = {
  readonly heldCount: number;
  readonly pieceCount: number;
  readonly completedSets: number;
  readonly setCount: number;
  readonly showpiece: { readonly name: string; readonly note: string } | undefined;
};

export function selectShelf(state: GameState, content: Content): ShelfView {
  const { pieces, sets } = content.collection;
  const shown = pieces.find((piece) => piece.id === state.showpiece);
  return {
    heldCount: pieces.filter((piece) =>
      state.collectibles.some((owned) => owned.pieceId === piece.id),
    ).length,
    pieceCount: pieces.length,
    completedSets: selectCollectionSets(state, content).completedCount,
    setCount: sets.length,
    showpiece: shown === undefined ? undefined : { name: shown.name, note: shown.note },
  };
}
