import type { CollectionCategory } from './collectionSchema';
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

export function collectionFits(content: Content): string[] {
  const { categories, pieces, lotCount } = content.collection;
  const known = new Set(categories.map((category) => category.id));
  const firstTier = pieces.filter((piece) => piece.tier === 1).length;
  return [
    ...categories.flatMap(curveIssues),
    ...pieces
      .filter((piece) => !known.has(piece.category))
      .map((piece) => `Collectible ${piece.id} has no category rules`),
    ...(known.size === categories.length ? [] : ['Collectible categories must not repeat']),
    ...(firstTier >= lotCount ? [] : ['The first tier needs a collectible for every lot']),
  ];
}
