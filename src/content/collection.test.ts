import { COLLECTIBLE_CATEGORIES } from '@/domain/collection/rules';
import { dollars } from '@/domain/money';

import { economyV1 } from './economy-v1';
import { economyV2 } from './economy-v2';
import { findContentIssues, getContent, validateContent } from './index';
import type { ContentInput } from './schema';

type Collection = NonNullable<ContentInput['collection']>;

const issuesFor = (mutate: (collection: Collection) => void) => {
  const content: ContentInput & { collection: Collection } = structuredClone(economyV2);
  mutate(content.collection);
  return findContentIssues(content);
};

const PERCENT = 100n;
const BPS = 10_000n;

const everyone = (collection: ReturnType<typeof getContent>['collection']) => {
  const sets = collection.sets.filter((set) => set.access === 'open');
  const pieceIds = new Set(sets.flatMap((set) => set.pieceIds));
  return { sets, pieces: collection.pieces.filter((piece) => pieceIds.has(piece.id)) };
};

describe('the collection in content (COL01)', () => {
  const { collection } = getContent();
  const open = everyone(collection);

  it('holds sixty pieces, ten in each of six categories, from $500 to $5B', () => {
    const counts = COLLECTIBLE_CATEGORIES.map(
      (category) => open.pieces.filter((piece) => piece.category === category).length,
    );
    const prices = collection.pieces.map((piece) => Number(piece.price));
    expect(counts).toEqual([10, 10, 10, 10, 10, 10]);
    expect(Math.min(...prices)).toBe(Number(dollars('500')));
    expect(Math.max(...prices)).toBe(Number(dollars('5,000,000,000')));
  });

  it('draws three lots every six business days and pays 90 percent on a sale', () => {
    expect(collection).toMatchObject({ lotCount: 3, lotDays: 6, saleReturnPercent: 90 });
    expect(open.pieces.filter((piece) => piece.tier === 1)).toHaveLength(18);
  });

  it('keeps the best possible resale under double the price paid', () => {
    const best = collection.categories.map((category) => {
      const aged = category.ageCurve.reduce((high, point) => Math.max(high, point.bps), 0);
      const high = BigInt(aged) * (BPS + BigInt(category.swingBps));
      const low = BPS * (BPS - BigInt(category.swingBps));
      const pays = collection.saleReturnPercent + collection.perkCaps.resale;
      return Number((high * BigInt(pays)) / low);
    });
    expect(best).toEqual([192, 146, 117, 106, 159, 178]);
    expect(Math.max(...best)).toBeLessThan(2 * Number(PERCENT));
  });

  it('leaves economy 1 without a collection', () => {
    expect(validateContent(economyV1).collection).toMatchObject({ lotCount: 0, pieces: [] });
  });

  it('rejects categories and pieces that do not fit', () => {
    expect(
      issuesFor((draft) => {
        draft.categories[0]!.ageCurve[0]!.bps = 9000;
      }),
    ).toEqual(['Collectible category art must start at its list price']);
    expect(
      issuesFor((draft) => {
        draft.categories.pop();
      }),
    ).toContain('Collectible flown_first_stage_booster has no category rules');
    expect(
      issuesFor((draft) => {
        draft.pieces[1]!.id = draft.pieces[0]!.id;
      }),
    ).toEqual([
      'Duplicate collectible ID: corner_cafe_sketch',
      'Collection set sketchbook holds a piece outside its category',
    ]);
  });
});

describe('collection sets in content (COL07)', () => {
  const { collection } = getContent();
  const open = everyone(collection);

  it('holds twelve sets of five, two in each category, covering every piece once', () => {
    const counts = COLLECTIBLE_CATEGORIES.map(
      (category) => open.sets.filter((set) => set.category === category).length,
    );
    const covered = collection.sets.flatMap((set) => set.pieceIds);
    expect(counts).toEqual([2, 2, 2, 2, 2, 2]);
    expect(open.sets.map((set) => set.pieceIds.length)).toEqual(Array(12).fill(5));
    expect(new Set(covered).size).toBe(collection.pieces.length);
  });

  const total = (kind: 'tap' | 'resale') =>
    open.sets
      .filter((set) => set.perk.kind === kind)
      .reduce((sum, set) => sum + set.perk.percent, 0);

  it('caps every finished set together at +30% tap income and 96% on a sale', () => {
    expect(collection.perkCaps).toEqual({ tap: 30, resale: 6 });
    expect([total('tap'), total('resale')]).toEqual([30, 6]);
  });

  it('keeps one set of five for Collector’s pass holders, with a fourth lot (#158)', () => {
    const pass = collection.sets.filter((set) => set.access === 'pass');
    expect(collection.passLotCount).toBe(1);
    expect(pass).toMatchObject([
      { id: 'collectors_vault', category: 'curiosities', perk: { kind: 'tap', percent: 5 } },
    ]);
    expect(pass[0]?.pieceIds).toHaveLength(5);
    expect(collection.pieces).toHaveLength(65);
  });

  it('adds four collection goals to the thirteen of economy 1', () => {
    const goals = getContent().goals.filter((goal) => goal.kind === 'collection');
    expect(goals.map((goal) => [goal.id, goal.measure, goal.count])).toEqual([
      ['collection_first_piece', 'pieces', 1],
      ['collection_every_category', 'categories', 6],
      ['collection_first_set', 'sets', 1],
      ['collection_every_set', 'sets', 12],
    ]);
  });

  it('rejects sets and perks that do not fit', () => {
    expect(
      issuesFor((draft) => {
        draft.sets[0]!.pieceIds[1] = draft.sets[0]!.pieceIds[0]!;
        draft.sets[2]!.pieceIds[0] = 'puffin_dinghy';
        draft.sets[3]!.perk.percent = 7;
        draft.perkCaps.resale = 11;
      }),
    ).toEqual([
      'Collection set sketchbook repeats a piece',
      'Collection set sunday_drivers holds a piece outside its category',
      'Collection tap perks pass their cap',
      'A sale must not pay more than appraised value',
      'A piece may belong to one collection set only',
    ]);
  });
});
