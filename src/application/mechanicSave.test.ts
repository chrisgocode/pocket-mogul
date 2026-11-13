import { readFileSync } from 'node:fs';

import { encodeSave } from './saveFormat';
import { currentState } from './testGame';

const baselineFixture = readFileSync(
  new URL('fixtures/save-baseline.json', import.meta.url),
  'utf8',
);

const baselineDocument = (change: Record<string, unknown>) =>
  JSON.stringify({ ...(JSON.parse(baselineFixture) as object), ...change });

describe('food cart spot and menu (BUS20d)', () => {
  const foodCart = {
    status: 'active',
    spot: 'market',
    crowds: { park: 'quiet', offices: 'steady', campus: 'busy', market: 'busy', stadium: 'quiet' },
    menu: { combo: 'offered', snacks: 'withdrawn', express: 'offered' },
    secondWindow: 'installed',
  } as const;

  it('loads a baseline save with the mechanic inactive', () => {
    expect(currentState(baselineFixture)).toMatchObject({
      businesses: [{ foodCart: { status: 'inactive' } }],
    });
  });

  it('keeps the food cart in a top-level record and round-trips it', () => {
    const stored = baselineDocument({ foodCart: { vending: foodCart } });
    const encoded = encodeSave(currentState(stored));
    const document = JSON.parse(encoded) as { businesses: readonly object[] };
    expect(document).toMatchObject({ foodCart: { vending: foodCart } });
    expect(document.businesses[0]).not.toHaveProperty('foodCart');
    expect(currentState(encoded)).toMatchObject({ businesses: [{ foodCart }] });
  });
});

describe('coffee kiosk rush plan and beans (BUS20e)', () => {
  const coffeeKiosk = {
    status: 'active',
    grade: 'single_origin',
    plan: 'prebatch',
    orderAhead: 'installed',
  } as const;

  it('loads a baseline save with the mechanic inactive', () => {
    expect(currentState(baselineFixture)).toMatchObject({
      businesses: [{ coffeeKiosk: { status: 'inactive' } }],
    });
  });

  it('keeps the coffee kiosk in a top-level record and round-trips it', () => {
    const stored = baselineDocument({ coffeeKiosk: { vending: coffeeKiosk } });
    const encoded = encodeSave(currentState(stored));
    const document = JSON.parse(encoded) as { businesses: readonly object[] };
    expect(document).toMatchObject({ coffeeKiosk: { vending: coffeeKiosk } });
    expect(document.businesses[0]).not.toHaveProperty('coffeeKiosk');
    expect(currentState(encoded)).toMatchObject({ businesses: [{ coffeeKiosk }] });
  });
});

describe('laundromat machine mix and service washes (BUS20f)', () => {
  const laundromat = {
    status: 'active',
    jumboPercent: 40,
    serviceLevel: 2,
    pickup: 'installed',
  } as const;

  it('loads a baseline save with the mechanic inactive', () => {
    expect(currentState(baselineFixture)).toMatchObject({
      businesses: [{ laundromat: { status: 'inactive' } }],
    });
  });

  it('keeps the laundromat in a top-level record and round-trips it', () => {
    const stored = baselineDocument({ laundromat: { vending: laundromat } });
    const encoded = encodeSave(currentState(stored));
    const document = JSON.parse(encoded) as { businesses: readonly object[] };
    expect(document).toMatchObject({ laundromat: { vending: laundromat } });
    expect(document.businesses[0]).not.toHaveProperty('laundromat');
    expect(currentState(encoded)).toMatchObject({ businesses: [{ laundromat }] });
  });
});

describe('bakery oven schedule and wholesale orders (BUS20g)', () => {
  const bakery = {
    status: 'active',
    bakePercent: 80,
    orders: [{ clientId: 'corner_cafe', ordersPerDay: 450, priceBps: 7500, endsDay: 9 }],
    answeredOffer: 3,
    centralKitchen: 'installed',
  } as const;

  it('loads a baseline save with the mechanic inactive', () => {
    expect(currentState(baselineFixture)).toMatchObject({
      businesses: [{ bakery: { status: 'inactive' } }],
    });
  });

  it('keeps the bakery in a top-level record and round-trips it', () => {
    const stored = baselineDocument({ bakery: { vending: bakery } });
    const encoded = encodeSave(currentState(stored));
    const document = JSON.parse(encoded) as { businesses: readonly object[] };
    expect(document).toMatchObject({ bakery: { vending: bakery } });
    expect(document.businesses[0]).not.toHaveProperty('bakery');
    expect(currentState(encoded)).toMatchObject({ businesses: [{ bakery }] });
  });
});

describe('gym memberships and classes (BUS20h)', () => {
  const gym = {
    status: 'active',
    members: 12_500,
    tier: 'plus',
    classLevel: 2,
    allHours: 'installed',
  } as const;

  it('loads a baseline save with the mechanic inactive', () => {
    expect(currentState(baselineFixture)).toMatchObject({
      businesses: [{ gym: { status: 'inactive' } }],
    });
  });

  it('keeps the gym in a top-level record and round-trips it', () => {
    const stored = baselineDocument({ gym: { vending: gym } });
    const encoded = encodeSave(currentState(stored));
    const document = JSON.parse(encoded) as { businesses: readonly object[] };
    expect(document).toMatchObject({ gym: { vending: gym } });
    expect(document.businesses[0]).not.toHaveProperty('gym');
    expect(currentState(encoded)).toMatchObject({ businesses: [{ gym }] });
  });
});
