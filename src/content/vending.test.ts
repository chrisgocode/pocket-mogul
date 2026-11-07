import { economyV1 } from './economy-v1';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type VendingInput = NonNullable<ContentInput['businesses'][number]['mechanic']>;

function vendingOf(content: ContentInput): VendingInput {
  const mechanic = content.businesses.find((business) => business.id === 'vending')?.mechanic;
  if (mechanic === undefined) throw new Error('The Vending Machine has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (vending: VendingInput) => void) => {
  const content: ContentInput = structuredClone(economyV1);
  mutate(vendingOf(content));
  return findContentIssues(content);
};

describe('the Vending Machine mechanic in content (BUS20a)', () => {
  it('gives only the Vending Machine a vending mechanic, unlocked at Local', () => {
    const flagships = getContent().businesses.filter((business) => business.mechanic !== undefined);
    expect(flagships.map((business) => business.id)).toEqual(['vending']);
    expect(vendingOf(economyV1).unlockStage).toBe(2);
  });

  it('rejects a taste or mix that does not add up to 100 percent', () => {
    expect(
      issuesFor((vending) => {
        vending.locations.gym.taste.healthy = 40;
        vending.mixes.balanced.snacks = 40;
      }),
    ).toEqual([
      'Business vending location gym taste must add up to 100%',
      'Business vending mix balanced must add up to 100%',
    ]);
  });

  it('rejects a poor match at or above a perfect one', () => {
    expect(
      issuesFor((vending) => {
        vending.matchBps.poor = 14_000;
      }),
    ).toEqual(['Business vending poor match must be below a perfect match']);
  });

  it('rejects stages that do not exist and an office too small for the top stage', () => {
    expect(
      issuesFor((vending) => {
        vending.unlockStage = 6;
        vending.cardReaders.stage = 1;
        vending.locations.office.slots = 50;
      }),
    ).toEqual([
      'Business vending mechanic must unlock at a stage that exists',
      'Business vending card readers must unlock at a stage after the mechanic',
      'Business vending office must hold every machine at the top stage',
    ]);
  });
});
