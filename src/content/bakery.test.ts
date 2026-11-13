import { economyV6 } from './economy-v6';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type BakeryInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'bakery' }
>;

function bakeryOf(content: ContentInput): BakeryInput {
  const mechanic = content.businesses.find((business) => business.id === 'bakery')?.mechanic;
  if (mechanic?.kind !== 'bakery') throw new Error('The Bakery has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (bakery: BakeryInput) => void) => {
  const content: ContentInput = structuredClone(economyV6);
  mutate(bakeryOf(content));
  return findContentIssues(content);
};

describe('the Bakery mechanic in content (BUS20g)', () => {
  it('gives only the Bakery an oven schedule and wholesale orders, unlocked at Local', () => {
    const bakeries = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'bakery',
    );
    expect(bakeries.map((business) => business.id)).toEqual(['bakery']);
    expect(bakeryOf(economyV6)).toMatchObject({
      unlockStage: 2,
      bakePercents: [60, 70, 80, 90, 100],
      wholesale: { offerDays: 2, maxOrders: 2 },
      centralKitchen: { stage: 5, capacityPercent: 30 },
    });
  });

  it('keeps the earlier mechanics and passes validation as bundled', () => {
    const kinds = getContent().businesses.map((business) => business.mechanic?.kind);
    expect(kinds.filter((kind) => kind !== undefined)).toHaveLength(7);
    expect(findContentIssues(economyV6)).toEqual([]);
  });

  it('rejects bake levels and wholesale terms that do not fit', () => {
    expect(
      issuesFor((bakery) => {
        bakery.bakePercents = [60, 80];
        bakery.wholesale.sizePercents = [50];
        bakery.wholesale.priceBps = { min: 9000, max: 10_000 };
        bakery.wholesale.days = { min: 8, max: 4 };
        bakery.wholesale.clients = [
          { id: 'twin', name: 'Twin One' },
          { id: 'twin', name: 'Twin Two' },
        ];
      }),
    ).toEqual([
      'Business bakery bake levels must rise to a full bake',
      'Business bakery wholesale orders must leave ovens for retail',
      'Business bakery wholesale prices must be a range below the retail price',
      'Business bakery wholesale lengths must be a range',
      'Business bakery wholesale clients must have unique IDs',
    ]);
  });

  it('rejects a mechanic or central kitchen at a stage that does not fit', () => {
    expect(
      issuesFor((bakery) => {
        bakery.unlockStage = 6;
        bakery.centralKitchen.stage = 1;
      }),
    ).toEqual([
      'Business bakery mechanic must unlock at a stage that exists',
      'Business bakery central kitchen must unlock at a stage after the mechanic',
    ]);
  });
});
