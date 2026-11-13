import type { CollectionSetsView, CollectionSetView } from '@/application/collectionSetsView';
import type { AuctionLot, CollectionView, OwnedPiece } from '@/application/collectionView';
import type { Rarity } from '@/domain/collection/rules';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';

const RARITY_NAMES: Readonly<Record<Rarity, string>> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
};

const dayCount = (days: number) => (days === 1 ? '1 day' : `${days} days`);

export function pieceKind(described: AuctionLot | OwnedPiece): string {
  return `${described.categoryName} · ${RARITY_NAMES[described.piece.rarity]}`;
}

export function auctionNote(view: CollectionView): string {
  return `New lots in ${dayCount(view.daysUntilNewLots)} · ${view.lots.length} lots every ${dayCount(view.lotDays)}`;
}

export function lotActionLabel(lot: AuctionLot): string {
  if (lot.status === 'owned') return 'In your collection';
  if (lot.affordable) return `Buy · ${formatMoneyExact(lot.priceCents)}`;
  return `Need ${formatMoneyExact(lot.shortfallCents)} more`;
}

export function heldNote(owned: OwnedPiece): string {
  const held = owned.daysHeld === 0 ? 'Bought today' : `Held ${dayCount(owned.daysHeld)}`;
  return `${held} · ${formatCashChange(owned.gainCents)} since you bought it`;
}

export function piecesNote(view: CollectionView): string {
  return `${view.pieces.length} of ${view.pieceCount} pieces · selling pays ${view.saleReturnPercent}% of appraised value`;
}

export function perkLabel(perk: CollectionSetView['perk']): string {
  return perk.kind === 'tap' ? `+${perk.percent}% tap income` : `Sales pay +${perk.percent}%`;
}

export function setDetail(set: CollectionSetView): string {
  return set.status === 'complete' ? 'Perk active' : `Missing ${set.missing.join(', ')}`;
}

export function setsNote(sets: CollectionSetsView): string {
  const finished = `${sets.completedCount} of ${sets.sets.length} finished`;
  const perks = [
    sets.tapBonusPercent > 0 && `+${sets.tapBonusPercent}% tap income`,
    sets.resaleBonusPercent > 0 && `sales pay +${sets.resaleBonusPercent}%`,
  ].filter((perk) => perk !== false);
  return [finished, ...perks, 'selling a piece ends its set perk'].join(' · ');
}
