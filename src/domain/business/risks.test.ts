import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { profitPerDayCents, quoteBusinessDay } from './core';
import type { BusinessDefinition, IncidentType } from './definition';
import type { OwnedBusiness } from './owned';
import { quoteInsurance, type StruckIncident } from './risks';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const SAFE_DAYS = 30;

const certain = (incident: IncidentType): IncidentType => ({ ...incident, chanceBps: 10_000 });
const [breakdown, vandalism, expiredStock] = vendingDefinition.incidents;
const costRise: IncidentType = {
  id: 'vending_price_rise',
  category: 'supply',
  chanceBps: 10_000,
  effect: { kind: 'cost', percent: 50, days: 4 },
};

const withIncidents = (...incidents: IncidentType[]): BusinessDefinition => ({
  ...vendingDefinition,
  incidents,
});

const settle = (
  business: OwnedBusiness,
  run: { days: number; definition?: BusinessDefinition; seed?: string; fromDay?: number },
) =>
  settleBusinesses([business], {
    fromMs: (run.fromDay ?? 0) * DAY_MS,
    elapsedMs: run.days * DAY_MS,
    economy: { catalog: [run.definition ?? vendingDefinition], rules: businessRules },
    seed: run.seed ?? 'risks',
  });

const funded = (change: Partial<OwnedBusiness> = {}) =>
  ownedBusiness('vending', { treasuryCents: dollars('100'), payoutPercent: 0, ...change });

const struckAt30 = (definition: BusinessDefinition, change: Partial<OwnedBusiness> = {}) =>
  settle(funded(change), { days: SAFE_DAYS, definition }).businesses[0]!;
const pricing = { definition: vendingDefinition, rules: businessRules };
const insured = (policy: 'active' | 'lapsed', change: Partial<OwnedBusiness> = {}) =>
  funded({
    stage: 2,
    insurance: { equipment: policy, liability: policy, supply: 'none' },
    ...change,
  });

describe('incident safety (AC38)', () => {
  const alwaysBreaks = withIncidents(certain(breakdown!));

  it('draws none in the first 30 days after purchase', () => {
    expect(settle(funded(), { days: SAFE_DAYS - 1, definition: alwaysBreaks }).incidents).toEqual(
      [],
    );
  });

  it('can strike from the 30th day after purchase', () => {
    expect(settle(funded(), { days: SAFE_DAYS, definition: alwaysBreaks }).incidents).toEqual([
      {
        businessId: 'vending',
        incidentId: 'vending_breakdown',
        atMs: SAFE_DAYS * DAY_MS,
        treasuryLossCents: dollars('0'),
        insured: false,
      },
    ]);
  });

  it('keeps at most one active incident, starting the next only when one ends', () => {
    const struck = settle(funded(), { days: SAFE_DAYS + 9, definition: alwaysBreaks }).incidents;
    expect(struck.map((incident) => incident.atMs / DAY_MS)).toEqual([30, 34, 38]);
  });

  it('caps a treasury loss at 20 percent of the treasury and never touches cash', () => {
    const alwaysVandalized = withIncidents(certain(vandalism!));
    const calm = withIncidents();
    const business = funded({ purchasedDay: -SAFE_DAYS, payoutPercent: 50 });
    const hit = settle(business, { days: 1, definition: alwaysVandalized });
    const quiet = settle(business, { days: 1, definition: calm });
    expect(hit.incidents[0]?.treasuryLossCents).toBe(dollars('30'));
    expect(hit.businesses[0]?.treasuryCents).toBe(dollars('120'));
    expect(quiet.businesses[0]?.treasuryCents).toBe(dollars('150'));
    expect<bigint>(hit.toCashCents).toBe(quiet.toCashCents);
  });

  it('draws nothing for a closed business', () => {
    const closed = funded({
      purchasedDay: -SAFE_DAYS,
      status: 'closed',
      treasuryCents: dollars('0'),
    });
    expect(
      settle(closed, { days: 5, definition: withIncidents(certain(breakdown!)) }).incidents,
    ).toEqual([]);
  });
});

describe('a capacity or cost incident (BUS16)', () => {
  it('cuts capacity by its percent until its last day', () => {
    const broken = struckAt30(withIncidents(certain(breakdown!)));
    expect(broken.incident).toEqual({
      status: 'active',
      incidentId: 'vending_breakdown',
      endsDay: 34,
      capacityBps: 7000,
      costBps: 10_000,
    });
    expect(
      quoteBusinessDay(broken, { definition: vendingDefinition, rules: businessRules }),
    ).toMatchObject({
      capacity: 70,
      served: 70,
    });
  });

  it('raises the cost per customer served', () => {
    const pricier = struckAt30(withIncidents(costRise));
    expect(
      quoteBusinessDay(pricier, { definition: vendingDefinition, rules: businessRules }),
    ).toMatchObject({
      costPerServedCents: dollars('0.36'),
    });
  });

  it('ends on its last day and the business recovers', () => {
    const broken = funded({
      incident: {
        status: 'active',
        incidentId: 'vending_breakdown',
        endsDay: 2,
        capacityBps: 7000,
        costBps: 10_000,
      },
    });
    const days = (count: number) =>
      settle(broken, { days: count, definition: withIncidents(expiredStock!) }).businesses[0]!;
    expect(days(1).incident.status).toBe('active');
    expect(days(2).incident).toEqual({ status: 'none' });
  });
});

describe('insurance (BUS17)', () => {
  it('is locked until Local', () => {
    expect(quoteInsurance(funded(), { ...pricing, category: 'equipment' })).toEqual({
      status: 'locked',
      category: 'equipment',
      unlockStage: 2,
    });
  });

  it('costs 2 percent of catalog revenue per day for each policy', () => {
    expect(quoteInsurance(insured('active'), { ...pricing, category: 'supply' })).toEqual({
      status: 'available',
      category: 'supply',
      policy: 'none',
      premiumCents: dollars('2.80'),
    });
    expect(profitPerDayCents(insured('active'), pricing)).toBe(dollars('94.40'));
    expect(profitPerDayCents(insured('lapsed'), pricing)).toBe(dollars('100'));
  });

  it('covers 80 percent of a treasury loss in its category', () => {
    const business = insured('active', { purchasedDay: -SAFE_DAYS });
    const hit = settle(business, { days: 1, definition: withIncidents(certain(vandalism!)) });
    expect(hit.incidents[0]).toMatchObject({ insured: true, treasuryLossCents: dollars('7.78') });
  });

  it('halves a capacity loss and its duration', () => {
    const covered = settle(insured('active'), {
      days: SAFE_DAYS,
      definition: withIncidents(certain(breakdown!)),
    }).businesses[0]!;
    expect(covered.incident).toMatchObject({ capacityBps: 8500, endsDay: 32 });
  });

  it('lapses at a day boundary when the treasury cannot pay its premium', () => {
    const short = insured('active', { treasuryCents: dollars('1'), payoutPercent: 100 });
    const after = settle(short, { days: 1, definition: withIncidents() }).businesses[0]!;
    expect(after.insurance).toEqual({ equipment: 'lapsed', liability: 'lapsed', supply: 'none' });
  });

  it('is renewed by a manager once the treasury can pay again, but not without one', () => {
    const calm = withIncidents();
    const lapsed = insured('lapsed');
    const managed = { ...lapsed, staff: { operations: 0, sales: 0, manager: 1 } };
    expect(settle(lapsed, { days: 1, definition: calm }).businesses[0]?.insurance.equipment).toBe(
      'lapsed',
    );
    expect(settle(managed, { days: 1, definition: calm }).businesses[0]?.insurance).toEqual({
      equipment: 'active',
      liability: 'active',
      supply: 'none',
    });
  });
});

type Stepped = {
  readonly businesses: readonly OwnedBusiness[];
  readonly incidents: readonly StruckIncident[];
  readonly toCashCents: bigint;
};

describe('seeded incidents (AC37)', () => {
  const owned = funded({ purchasedDay: 0, payoutPercent: 50 });

  it('draws the same incidents and balances in small steps as in one settlement', () => {
    const once = settle(owned, { days: 200, seed: 'replay' });
    const start: Stepped = { businesses: [owned], incidents: [], toCashCents: 0n };
    const stepped = Array.from({ length: 400 }, (_, step) => step).reduce<Stepped>(
      (sofar, step) => {
        const next = settleBusinesses(sofar.businesses, {
          fromMs: step * (DAY_MS / 2),
          elapsedMs: DAY_MS / 2,
          economy: { catalog: [vendingDefinition], rules: businessRules },
          seed: 'replay',
        });
        return {
          businesses: next.businesses,
          incidents: [...sofar.incidents, ...next.incidents],
          toCashCents: sofar.toCashCents + next.toCashCents,
        };
      },
      start,
    );
    expect(once.incidents.length).toBeGreaterThan(0);
    expect(stepped.incidents).toEqual(once.incidents);
    expect(stepped.businesses).toEqual(once.businesses);
    expect<bigint>(stepped.toCashCents).toBe(once.toCashCents);
  });

  it('draws a different path from a different seed', () => {
    const replay = settle(owned, { days: 200, seed: 'replay' }).incidents;
    expect(settle(owned, { days: 200, seed: 'another' }).incidents).not.toEqual(replay);
  });
});
