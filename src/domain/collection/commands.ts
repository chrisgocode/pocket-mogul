import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { spend } from '@/domain/pricing';

import { collectibleSaleCents, findPiece, listPriceCents } from './appraisal';
import { lotsOnOffer } from './offer';
import { collectionDayOf, type CollectionEconomy } from './rules';

type CollectibleOrder = { readonly pieceId: string; readonly economy: CollectionEconomy };

export function applyBuyCollectible(
  state: GameState,
  order: CollectibleOrder & { readonly priceCents: MoneyCents },
): CommandResult {
  const { economy } = order;
  const piece = findPiece(economy, order.pieceId);
  if (piece === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  if (state.collectibles.some((owned) => owned.pieceId === piece.id))
    return { ok: false, error: 'ALREADY_OWNED' };
  const today = collectionDayOf(state, economy.rules);
  const onOffer = lotsOnOffer(state, economy).includes(piece);
  const priceCents = listPriceCents(piece, { ...today, economy });
  if (!onOffer || priceCents !== order.priceCents) return { ok: false, error: 'STALE_QUOTE' };
  const bought = { pieceId: piece.id, acquiredDay: today.day, paidCents: priceCents };
  return spend({ ...state, collectibles: [...state.collectibles, bought] }, priceCents);
}

export function applySellCollectible(state: GameState, order: CollectibleOrder): CommandResult {
  if (findPiece(order.economy, order.pieceId) === undefined)
    return { ok: false, error: 'UNKNOWN_ASSET' };
  const owned = state.collectibles.find((each) => each.pieceId === order.pieceId);
  if (owned === undefined) return { ok: false, error: 'NOT_OWNED' };
  const today = collectionDayOf(state, order.economy.rules);
  const proceedsCents = collectibleSaleCents(owned, {
    ...today,
    economy: order.economy,
    held: state.collectibles,
  });
  return {
    ok: true,
    cashChangeCents: proceedsCents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + proceedsCents),
      collectibles: state.collectibles.filter((each) => each !== owned),
      showpiece: state.showpiece === owned.pieceId ? null : state.showpiece,
    },
  };
}

export function applySetShowpiece(
  state: GameState,
  order: { readonly pieceId: string | null },
): CommandResult {
  const { pieceId } = order;
  if (pieceId !== null && !state.collectibles.some((owned) => owned.pieceId === pieceId))
    return { ok: false, error: 'NOT_OWNED' };
  return { ok: true, cashChangeCents: moneyCents(0), state: { ...state, showpiece: pieceId } };
}
