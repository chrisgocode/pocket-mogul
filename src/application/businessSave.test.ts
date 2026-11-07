import { readFileSync } from 'node:fs';

import { dollars } from '@/domain/money';

import { encodeSave } from './saveFormat';
import { currentState } from './testGame';

const baselineFixture = readFileSync(
  new URL('fixtures/save-baseline.json', import.meta.url),
  'utf8',
);

const baselineDocument = (change: Record<string, unknown>) =>
  JSON.stringify({ ...(JSON.parse(baselineFixture) as object), ...change });

describe('business staff (BUS13)', () => {
  const staff = { operations: 2, sales: 1, manager: 0 };

  it('loads a baseline save with no staff hired', () => {
    expect(currentState(baselineFixture).businesses[0]?.staff).toEqual({
      operations: 0,
      sales: 0,
      manager: 0,
    });
  });

  it('keeps staff in a top-level staffing record that round-trips', () => {
    const staffed = baselineDocument({ staffing: { vending: staff } });
    const encoded = encodeSave(currentState(staffed));
    const document = JSON.parse(encoded) as { businesses: readonly object[] };
    expect(document).toMatchObject({ staffing: { vending: staff } });
    expect(document.businesses[0]).not.toHaveProperty('staff');
    expect(currentState(encoded).businesses[0]?.staff).toEqual(staff);
  });
});

describe('business risks (BUS16, BUS17)', () => {
  const risks = {
    insurance: { equipment: 'active', liability: 'lapsed', supply: 'none' },
    incident: {
      status: 'active',
      incidentId: 'vending_breakdown',
      endsDay: 150,
      capacityBps: 7000,
      costBps: 10000,
    },
  } as const;
  const strike = {
    atMs: 90_000_000,
    businessId: 'vending',
    incidentId: 'vending_vandalism',
    treasuryLossCents: dollars('5.60'),
    insured: true,
  };
  const pendingSummary = {
    status: 'pending',
    summary: {
      awayMs: 3_600_000,
      creditedMs: 3_600_000,
      earnings: { businesses: '600', rent: '0', dividends: '0' },
      closures: [],
    },
  };

  it('loads a baseline save with no insurance, no incident and no incident entries', () => {
    expect(currentState(baselineFixture)).toMatchObject({
      businesses: [
        {
          insurance: { equipment: 'none', liability: 'none', supply: 'none' },
          incident: { status: 'none' },
        },
      ],
      activity: { lifetime: { byKind: { incident: 0 } } },
    });
  });

  it('keeps risks, absence incidents and the incident count at the top level, and round-trips them', () => {
    const stored = baselineDocument({
      risks: { vending: risks },
      returnSummary: pendingSummary,
      absenceIncidents: [{ ...strike, treasuryLossCents: '560' }],
      incidentEntries: 4,
    });
    const encoded = encodeSave(currentState(stored));
    const document = JSON.parse(encoded) as {
      businesses: readonly object[];
      returnSummary: { summary: object };
    };
    expect(document).toMatchObject({ risks: { vending: risks }, incidentEntries: 4 });
    expect(document.businesses[0]).not.toHaveProperty('insurance');
    expect(document.returnSummary.summary).not.toHaveProperty('incidents');
    expect(currentState(encoded)).toMatchObject({
      businesses: [risks],
      returnSummary: { summary: { incidents: [strike] } },
      activity: { lifetime: { byKind: { incident: 4 } } },
    });
  });
});
