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

describe('the collection in content (COL01)', () => {
  const { collection } = getContent();

  it('holds sixty pieces, ten in each of six categories, from $500 to $5B', () => {
    const counts = COLLECTIBLE_CATEGORIES.map(
      (category) => collection.pieces.filter((piece) => piece.category === category).length,
    );
    const prices = collection.pieces.map((piece) => Number(piece.price));
    expect(counts).toEqual([10, 10, 10, 10, 10, 10]);
    expect(Math.min(...prices)).toBe(Number(dollars('500')));
    expect(Math.max(...prices)).toBe(Number(dollars('5,000,000,000')));
  });

  it('draws three lots every six business days and pays 90 percent on a sale', () => {
    expect(collection).toMatchObject({ lotCount: 3, lotDays: 6, saleReturnPercent: 90 });
    expect(collection.pieces.filter((piece) => piece.tier === 1)).toHaveLength(18);
  });

  it('keeps the best possible resale under double the price paid', () => {
    const best = collection.categories.map((category) => {
      const aged = category.ageCurve.reduce((high, point) => Math.max(high, point.bps), 0);
      const high = BigInt(aged) * (BPS + BigInt(category.swingBps));
      const low = BPS * (BPS - BigInt(category.swingBps));
      return Number((high * BigInt(collection.saleReturnPercent)) / low);
    });
    expect(best).toEqual([180, 137, 109, 99, 149, 167]);
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
    ).toEqual(['Duplicate collectible ID: corner_cafe_sketch']);
  });
});
