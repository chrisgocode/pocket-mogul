import type { AuctionLot, OwnedPiece } from '@/application/collectionView';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

export type CollectionAction =
  | { readonly kind: 'buy'; readonly lot: AuctionLot }
  | { readonly kind: 'sell'; readonly owned: OwnedPiece; readonly saleReturnPercent: number };

export function collectionActionCommand(action: CollectionAction): GameCommand {
  if (action.kind === 'buy')
    return {
      type: 'BuyCollectible',
      pieceId: action.lot.piece.id,
      priceCents: action.lot.priceCents,
    };
  return { type: 'SellCollectible', pieceId: action.owned.piece.id };
}

function buyText(lot: AuctionLot): ActionSheetText {
  return {
    title: `Buy ${lot.piece.name}`,
    lines: [
      { label: 'Cash change', value: formatCashChange(moneyCents(0n - lot.priceCents)) },
      { label: lot.categoryName, value: lot.valueNote },
      { label: 'Counts in net worth', value: 'At its appraised value, which moves each day' },
    ],
    confirmLabel: `Confirm purchase · ${formatMoneyExact(lot.priceCents)}`,
  };
}

function sellText(action: Extract<CollectionAction, { kind: 'sell' }>): ActionSheetText {
  const { owned } = action;
  const proceeds = formatCashChange(owned.saleCents);
  return {
    title: `Sell ${owned.piece.name}`,
    lines: [
      { label: 'Cash change', value: proceeds },
      { label: 'Appraised value', value: formatMoneyExact(owned.valueCents) },
      { label: 'Sale pays', value: `${action.saleReturnPercent}% of appraised value` },
      { label: 'You paid', value: formatMoneyExact(owned.paidCents) },
    ],
    confirmLabel: `Confirm sale · ${proceeds}`,
  };
}

export function collectionActionSheetText(action: CollectionAction): ActionSheetText {
  return action.kind === 'buy' ? buyText(action.lot) : sellText(action);
}
