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

export function lotKind(lot: AuctionLot): string {
  return lot.access === 'pass' ? `${pieceKind(lot)} · Collector's pass` : pieceKind(lot);
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

export function setNote(set: CollectionSetView): string {
  if (set.status === 'complete') return 'Perk active while you hold all five';
  const pieces = set.missing.join(', ');
  return set.status === 'locked' ? `Locked · Collector's pass: ${pieces}` : `Missing: ${pieces}`;
}

export function setsNote(sets: CollectionSetsView): string {
  const finished = `${sets.completedCount} of ${sets.setCount} finished`;
  const perks = [
    sets.tapBonusPercent > 0 && `+${sets.tapBonusPercent}% tap income`,
    sets.resaleBonusPercent > 0 && `sales pay +${sets.resaleBonusPercent}%`,
  ].filter((perk) => perk !== false);
  return [finished, ...perks, 'selling a piece ends its set perk'].join(' · ');
}
