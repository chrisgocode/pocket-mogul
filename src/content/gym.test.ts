import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type GymInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'gym' }
>;

function gymOf(content: ContentInput): GymInput {
  const mechanic = content.businesses.find((business) => business.id === 'gym_chain')?.mechanic;
  if (mechanic?.kind !== 'gym') throw new Error('The Gym Chain has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (gym: GymInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(gymOf(content));
  return findContentIssues(content);
};

describe('the Gym Chain mechanic in content (BUS20h)', () => {
  it('gives only the Gym Chain memberships and classes, unlocked at Local', () => {
    const gyms = getContent().businesses.filter((business) => business.mechanic?.kind === 'gym');
    expect(gyms.map((business) => business.id)).toEqual(['gym_chain']);
    expect(gymOf(economyV2)).toMatchObject({
      unlockStage: 2,
      joinsPerUnit: 300,
      classes: { maxLevel: 3 },
      allHours: { stage: 5, capacityPercent: 20 },
    });
  });

  it('keeps the earlier mechanics and passes validation as bundled', () => {
    const kinds = getContent().businesses.map((business) => business.mechanic?.kind);
    expect(kinds).toEqual(expect.arrayContaining(['laundromat', 'bakery']));
    expect(findContentIssues(economyV2)).toEqual([]);
  });

  it('rejects tiers out of order and classes that keep or take everything', () => {
    expect(
      issuesFor((gym) => {
        gym.tiers.elite.churnBps = 100;
        gym.classes.churnCutBps = 100;
        gym.classes.studioPercent = 40;
      }),
    ).toEqual([
      'Business gym_chain higher tiers must charge more and lose members faster',
      'Business gym_chain classes must leave some members leaving on every tier',
      'Business gym_chain classes must leave studio time for visits',
    ]);
  });

  it('rejects a mechanic or 24-hour access at a stage that does not fit', () => {
    expect(
      issuesFor((gym) => {
        gym.unlockStage = 6;
        gym.allHours.stage = 1;
      }),
    ).toEqual([
      'Business gym_chain mechanic must unlock at a stage that exists',
      'Business gym_chain 24-hour access must unlock at a stage after the mechanic',
    ]);
  });
});
