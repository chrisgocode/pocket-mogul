import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type FactoryInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'factory' }
>;

function factoryOf(content: ContentInput): FactoryInput {
  const mechanic = content.businesses.find((business) => business.id === 'manufacturer')?.mechanic;
  if (mechanic?.kind !== 'factory') throw new Error('The Manufacturing Company has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (factory: FactoryInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(factoryOf(content));
  return findContentIssues(content);
};

describe('the Manufacturing Company mechanic in content (BUS20j)', () => {
  it('gives only the Manufacturing Company products and bulk orders, unlocked at Local', () => {
    const factories = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'factory',
    );
    expect(factories.map((business) => business.id)).toEqual(['manufacturer']);
    expect(factoryOf(economyV2)).toMatchObject({
      unlockStage: 2,
      retoolDays: 1,
      bulk: { offerDays: 3, maxOrders: 2, penaltyBps: 5000 },
      automation: { stage: 5, costSavingPercent: 20 },
    });
  });

  it('stays on economy 2 and passes validation as bundled', () => {
    expect(getContent().economyVersion).toBe(2);
    expect(findContentIssues(economyV2)).toEqual([]);
  });

  it('rejects products out of order and bulk terms that do not fit', () => {
    expect(
      issuesFor((factory) => {
        factory.products.custom.priceBps = 9000;
        factory.bulk.sizePercents = [60];
        factory.bulk.rateBps = { min: 13_000, max: 10_500 };
        factory.bulk.days = { min: 10, max: 5 };
        factory.bulk.clients = [
          { id: 'twin', name: 'Twin One' },
          { id: 'twin', name: 'Twin Two' },
        ];
      }),
    ).toEqual([
      'Business manufacturer finer products must sell for more to fewer buyers',
      'Business manufacturer bulk orders must leave lines for the open market',
      'Business manufacturer bulk rates must be a range',
      'Business manufacturer bulk order lengths must be a range',
      'Business manufacturer bulk clients must have unique IDs',
    ]);
  });

  it('rejects a mechanic or automation at a stage that does not fit', () => {
    expect(
      issuesFor((factory) => {
        factory.unlockStage = 6;
        factory.automation.stage = 1;
      }),
    ).toEqual([
      'Business manufacturer mechanic must unlock at a stage that exists',
      'Business manufacturer automation must unlock at a stage after the mechanic',
    ]);
  });
});
