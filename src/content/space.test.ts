import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type SpaceInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'space' }
>;

function spaceOf(content: ContentInput): SpaceInput {
  const mechanic = content.businesses.find((business) => business.id === 'space_launch')?.mechanic;
  if (mechanic?.kind !== 'space') throw new Error('The Space Launch Company has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (space: SpaceInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(spaceOf(content));
  return findContentIssues(content);
};

describe('the Space Launch Company mechanic in content (BUS20l)', () => {
  it('gives only the Space Launch Company a cadence and payload contracts, unlocked at Local', () => {
    const companies = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'space',
    );
    expect(companies.map((business) => business.id)).toEqual(['space_launch']);
    expect(spaceOf(economyV2)).toMatchObject({
      unlockStage: 2,
      defaultCadence: 'standard',
      payloads: { offerDays: 4, maxContracts: 2, penaltyBps: 10_000 },
      boosters: { stage: 5, capacityPercent: 50 },
    });
  });

  it('leaves every one of the twelve businesses with a mechanic, on economy 2', () => {
    const content = getContent();
    expect(content.economyVersion).toBe(2);
    expect(content.businesses.filter((business) => business.mechanic === undefined)).toEqual([]);
    expect(content.businesses).toHaveLength(12);
    expect(findContentIssues(economyV2)).toEqual([]);
  });

  it('rejects weather and cadences that do not fit', () => {
    expect(
      issuesFor((space) => {
        space.weatherChanceBps.storm = 500;
        space.cadences.rapid.capacityBps = 9000;
      }),
    ).toEqual([
      'Business space_launch weather chances must add up to 100%',
      'Business space_launch a faster cadence must launch more and lose more to a storm',
    ]);
  });

  it('rejects payload terms and stages that do not fit', () => {
    expect(
      issuesFor((space) => {
        space.payloads.sizePercents = [60];
        space.payloads.rateBps = { min: 15_000, max: 11_000 };
        space.payloads.days = { min: 8, max: 4 };
        space.unlockStage = 6;
        space.boosters.stage = 1;
      }),
    ).toEqual([
      'Business space_launch payload contracts must leave pads for the open market',
      'Business space_launch payload rates must be a range',
      'Business space_launch payload contract lengths must be a range',
      'Business space_launch mechanic must unlock at a stage that exists',
      'Business space_launch reusable boosters must unlock at a stage after the mechanic',
    ]);
  });
});
