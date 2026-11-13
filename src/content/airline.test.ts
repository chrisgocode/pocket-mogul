import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type AirlineInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'airline' }
>;

function airlineOf(content: ContentInput): AirlineInput {
  const mechanic = content.businesses.find((business) => business.id === 'airline')?.mechanic;
  if (mechanic?.kind !== 'airline') throw new Error('The Airline has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (airline: AirlineInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(airlineOf(content));
  return findContentIssues(content);
};

describe('the Airline mechanic in content (BUS20k)', () => {
  it('gives only the Airline routes and fuel, unlocked at Local', () => {
    const airlines = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'airline',
    );
    expect(airlines.map((business) => business.id)).toEqual(['airline']);
    expect(airlineOf(economyV2)).toMatchObject({
      unlockStage: 2,
      defaultNetwork: 'regional',
      forecastDays: 2,
      hub: { stage: 5, capacityPercent: 15 },
    });
  });

  it('stays on economy 2 and passes validation as bundled', () => {
    expect(getContent().economyVersion).toBe(2);
    expect(findContentIssues(economyV2)).toEqual([]);
  });

  it('rejects networks that do not place the fleet and fuel figures that do not fit', () => {
    expect(
      issuesFor((airline) => {
        airline.networks.mixed.long = 30;
        airline.fuelChanceBps.cheap = 1000;
        airline.fuelCostBps.expensive = 9000;
      }),
    ).toEqual([
      'Business airline every network must place the whole fleet',
      'Business airline fuel chances must add up to 100%',
      'Business airline fuel must cost more from Cheap to Expensive',
    ]);
  });

  it('rejects a mechanic or hub at a stage that does not fit', () => {
    expect(
      issuesFor((airline) => {
        airline.unlockStage = 6;
        airline.hub.stage = 1;
      }),
    ).toEqual([
      'Business airline mechanic must unlock at a stage that exists',
      'Business airline hub must unlock at a stage after the mechanic',
    ]);
  });
});
