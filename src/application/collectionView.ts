import type { Content } from '@/content';
import {
  collectibleSaleCents,
  listPriceCents,
  ownedValueCents,
} from '@/domain/collection/appraisal';
import { auctionLots, daysUntilNewLots } from '@/domain/collection/auction';
import { saleReturnPercent } from '@/domain/collection/sets';
import {
  collectionDayOf,
  type CollectionDay,
  type CollectionEconomy,
  type OwnedCollectible,
} from '@/domain/collection/rules';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';
import { selectCashCents, stateWithUnsavedIncome } from './cashView';
import { selectCollectionSets, type CollectionSetsView } from './collectionSetsView';
import { collectionEconomy } from './economy';
import type { GameSnapshot } from './game';

type Piece = Content['collection']['pieces'][number];

type Described = {
  readonly piece: Piece;
  readonly categoryName: string;
  readonly valueNote: string;
};

export type AuctionLot = Described &
  Affordability & {
    readonly status: 'available' | 'owned';
    readonly priceCents: MoneyCents;
  };

export type OwnedPiece = Described & {
  readonly valueCents: MoneyCents;
  readonly paidCents: MoneyCents;
  readonly gainCents: MoneyCents;
  readonly saleCents: MoneyCents;
  readonly daysHeld: number;
  readonly display: 'on_show' | 'stored';
};

export type CollectionView = {
  readonly valueCents: MoneyCents;
  readonly pieceCount: number;
  readonly saleReturnPercent: number;
  readonly lotDays: number;
  readonly daysUntilNewLots: number;
  readonly lots: readonly AuctionLot[];
  readonly pieces: readonly OwnedPiece[];
  readonly sets: CollectionSetsView;
};

type Context = {
  readonly content: Content;
  readonly state: GameState;
  readonly cashCents: MoneyCents;
  readonly valuing: CollectionDay & { readonly economy: CollectionEconomy };
};

function described(piece: Piece, content: Content): Described {
  const category = content.collection.categories.find((each) => each.id === piece.category);
  return {
    piece,
    categoryName: category?.name ?? piece.category,
    valueNote: category?.valueNote ?? '',
  };
}

function lotOf(piece: Piece, context: Context): AuctionLot {
  const priceCents = listPriceCents(piece, context.valuing);
  const owned = context.state.collectibles.some((each) => each.pieceId === piece.id);
  return {
    ...described(piece, context.content),
    status: owned ? 'owned' : 'available',
    priceCents,
    ...affordability(priceCents, context.cashCents),
  };
}

function ownedOf(owned: OwnedCollectible, context: Context): OwnedPiece[] {
  const piece = context.content.collection.pieces.find((each) => each.id === owned.pieceId);
  if (piece === undefined) return [];
  const valueCents = ownedValueCents(owned, context.valuing);
  const selling = { ...context.valuing, held: context.state.collectibles };
  return [
    {
      ...described(piece, context.content),
      valueCents,
      paidCents: owned.paidCents,
      gainCents: moneyCents(valueCents - owned.paidCents),
      saleCents: collectibleSaleCents(owned, selling),
      daysHeld: context.valuing.day - owned.acquiredDay,
      display: context.state.showpiece === owned.pieceId ? 'on_show' : 'stored',
    },
  ];
}

export function selectCollection(snapshot: GameSnapshot, content: Content): CollectionView {
  const state = stateWithUnsavedIncome(snapshot, content);
  const economy = collectionEconomy(content);
  const valuing = { ...collectionDayOf(state, economy.rules), economy };
  const context = { content, state, valuing, cashCents: selectCashCents(snapshot, content) };
  const pieces = state.collectibles.flatMap((owned) => ownedOf(owned, context));
  const lots = auctionLots({ ...valuing, maxTier: Math.max(...state.unlockedTiers) });
  return {
    valueCents: moneyCents(pieces.reduce<bigint>((total, each) => total + each.valueCents, 0n)),
    pieceCount: content.collection.pieces.length,
    saleReturnPercent: saleReturnPercent(state.collectibles, economy),
    lotDays: economy.rules.lotDays,
    daysUntilNewLots: daysUntilNewLots(valuing.day, economy),
    lots: lots.flatMap((lot) => {
      const piece = content.collection.pieces.find((each) => each.id === lot.id);
      return piece === undefined ? [] : [lotOf(piece, context)];
    }),
    pieces,
    sets: selectCollectionSets(state, content),
  };
}
