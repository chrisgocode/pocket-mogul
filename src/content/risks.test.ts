import { economyV1 } from './economy-v1';
import { findContentIssues, getContent } from './index';

const clone = () => structuredClone(economyV1);
const issuesFor = (mutate: (c: ReturnType<typeof clone>) => void) => {
  const c = clone();
  mutate(c);
  return findContentIssues(c);
};

const named = (id: string) =>
  getContent()
    .businesses.find((business) => business.id === id)
    ?.incidents.map((incident) => `${incident.name} ${incident.effect.kind}`);

describe('business incidents in content (BUS16)', () => {
  it('gives every business one equipment, one liability and one supply incident', () => {
    const categories = getContent().businesses.map((business) =>
      business.incidents.map((incident) => incident.category),
    );
    expect(new Set(categories.map((each) => each.join()))).toEqual(
      new Set(['equipment,liability,supply']),
    );
  });

  it('follows the flagship incident lists', () => {
    expect(named('vending')).toEqual([
      'Breakdown capacity',
      'Vandalism treasury',
      'Expired stock treasury',
    ]);
    expect(named('car_wash')).toEqual([
      'Equipment failure capacity',
      'Damage claim treasury',
      'Water price rise cost',
    ]);
    expect(named('delivery')).toEqual([
      'Van crash capacity',
      'Lost-parcel claim treasury',
      'Fuel spike cost',
    ]);
  });
});

describe('content validation rejects', () => {
  it('a business without an incident in each category', () => {
    expect(issuesFor((c) => void (c.businesses[0]!.incidents[0]!.category = 'supply'))).toEqual([
      'Business vending needs exactly one equipment incident',
      'Business vending needs exactly one supply incident',
    ]);
  });

  it('incident chances that add up to certainty', () => {
    expect(issuesFor((c) => void (c.businesses[0]!.incidents[0]!.chanceBps = 9_700))).toEqual([
      'Business vending incident chances must stay below 100%',
    ]);
  });

  it('a reused incident ID', () => {
    expect(
      issuesFor((c) => void (c.businesses[1]!.incidents[0]!.id = 'vending_breakdown')),
    ).toEqual(['Duplicate incident ID: vending_breakdown']);
  });

  it('a capacity loss of 100 percent', () => {
    expect(
      issuesFor((c) => {
        c.businesses[0]!.incidents[0]!.effect = { kind: 'capacity', percent: 100, days: 4 };
      }).length,
    ).toBeGreaterThan(0);
  });

  it('insurance that unlocks past the last stage', () => {
    expect(issuesFor((c) => void (c.economy.businessRules.risks.insuranceFromStage = 6))).toEqual([
      'Insurance must unlock at a stage that exists',
    ]);
  });
});
