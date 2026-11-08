import { economyV1 } from './economy-v1';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type CarWashInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'car_wash' }
>;

function carWashOf(content: ContentInput): CarWashInput {
  const mechanic = content.businesses.find((business) => business.id === 'car_wash')?.mechanic;
  if (mechanic?.kind !== 'car_wash') throw new Error('The Car Wash has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (carWash: CarWashInput) => void) => {
  const content: ContentInput = structuredClone(economyV1);
  mutate(carWashOf(content));
  return findContentIssues(content);
};

describe('the Car Wash mechanic in content (BUS20b)', () => {
  it('gives only the Car Wash packages and memberships, unlocked at Local', () => {
    const flagships = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'car_wash',
    );
    expect(flagships.map((business) => business.id)).toEqual(['car_wash']);
    expect(carWashOf(economyV1)).toMatchObject({
      unlockStage: 2,
      weatherDemandBps: { sunny: 12_000, cloudy: 10_000, rain: 5000, after_rain: 16_000 },
      forecastDays: 3,
    });
  });

  it('rejects package shares and weather chances that do not add up', () => {
    expect(
      issuesFor((carWash) => {
        carWash.packages.deluxe.sharePercent = 20;
        carWash.weatherChanceBps.rain = 3000;
        carWash.detailing.sharePercent = 70;
      }),
    ).toEqual([
      'Business car_wash package shares must add up to 100%',
      'Business car_wash detailing must take no more walk-ins than Basic has',
      'Business car_wash weather chances must add up to 100%',
    ]);
  });

  it('rejects member caps off the cap steps and stages that do not exist', () => {
    expect(
      issuesFor((carWash) => {
        carWash.memberships.managerCapPercent.rainAhead = 50;
        carWash.unlockStage = 6;
        carWash.detailing.stage = 1;
      }),
    ).toEqual([
      'Business car_wash membership caps must sit on a cap step at or below the maximum',
      'Business car_wash mechanic must unlock at a stage that exists',
      'Business car_wash detailing must unlock at a stage after the mechanic',
    ]);
  });
});
