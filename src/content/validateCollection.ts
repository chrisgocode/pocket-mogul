import type { CollectionCategory, CollectionSetContent } from './collectionSchema';
import type { Content } from './schema';

const NO_EFFECT_BPS = 10_000;

function curveIssues(category: CollectionCategory): string[] {
  const { ageCurve, id } = category;
  const first = ageCurve[0];
  return [
    (first?.days !== 0 || first.bps !== NO_EFFECT_BPS) &&
      `Collectible category ${id} must start at its list price`,
    ageCurve.some((point, index) => index > 0 && point.days <= ageCurve[index - 1]!.days) &&
      `Collectible category ${id} age curve must move forward in days`,
  ].filter((issue) => issue !== false);
}

const WHOLE = 100;

function setIssues(set: CollectionSetContent, content: Content): string[] {
  const pieces = content.collection.pieces;
  const strangers = set.pieceIds.filter(
    (pieceId) => pieces.find((piece) => piece.id === pieceId)?.category !== set.category,
  );
  return [
    strangers.length > 0 && `Collection set ${set.id} holds a piece outside its category`,
    new Set(set.pieceIds).size !== set.pieceIds.length &&
      `Collection set ${set.id} repeats a piece`,
  ].filter((issue) => issue !== false);
}

function perkIssues(content: Content): string[] {
  const { sets, perkCaps, saleReturnPercent } = content.collection;
  const total = (kind: 'tap' | 'resale') =>
    sets.filter((set) => set.perk.kind === kind).reduce((sum, set) => sum + set.perk.percent, 0);
  const shared = sets.flatMap((set) => set.pieceIds);
  return [
    total('tap') > perkCaps.tap && 'Collection tap perks pass their cap',
    total('resale') > perkCaps.resale && 'Collection resale perks pass their cap',
    saleReturnPercent + perkCaps.resale > WHOLE && 'A sale must not pay more than appraised value',
    new Set(shared).size !== shared.length && 'A piece may belong to one collection set only',
  ].filter((issue) => issue !== false);
}

export function collectionFits(content: Content): string[] {
  const { categories, pieces, lotCount } = content.collection;
  const known = new Set(categories.map((category) => category.id));
  const firstTier = pieces.filter((piece) => piece.tier === 1).length;
  return [
    ...categories.flatMap(curveIssues),
    ...content.collection.sets.flatMap((set) => setIssues(set, content)),
    ...perkIssues(content),
    ...pieces
      .filter((piece) => !known.has(piece.category))
      .map((piece) => `Collectible ${piece.id} has no category rules`),
    ...(known.size === categories.length ? [] : ['Collectible categories must not repeat']),
    ...(firstTier >= lotCount ? [] : ['The first tier needs a collectible for every lot']),
  ];
}
