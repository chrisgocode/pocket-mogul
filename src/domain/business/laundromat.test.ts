import { dollars } from '@/domain/money';
import { laundromatBusiness, laundromatDefinition } from '@/domain/testLaundromat';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { profitPerDayCents, quoteBusinessDay } from './core';
import { bestJumboShare } from './laundromat';
import { quotePickup } from './laundromatQuotes';
import { managerDecisions } from './staff';

const pricing = { definition: laundromatDefinition, rules: businessRules };
const attendants = (operations: number, sales = 0) => ({
  staff: { operations, sales, manager: 0 },
});

describe('a laundromat at stage 1 (BUS20f)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('laundromat');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 550,
      capacity: 500,
      served: 500,
    });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('2,500'));
  });
});

describe('the machine mix (BUS20f)', () => {
  it('earns the shared-core profit with no jumbo machines', () => {
    expect(profitPerDayCents(laundromatBusiness(), pricing)).toBe(dollars('2,500'));
  });

  it('washes big loads at a higher price on slower machines', () => {
    const mixed = laundromatBusiness({ jumboPercent: 40 });
    expect(quoteBusinessDay(mixed, pricing)).toMatchObject({
      demand: 550,
      served: 440,
      revenueCents: dollars('3,668'),
      profitCents: dollars('2,740'),
    });
  });

  it('loses money with too little or too much of the floor in jumbo machines', () => {
    const profits = [0, 20, 40, 60].map((jumboPercent) =>
      profitPerDayCents(laundromatBusiness({ jumboPercent }), pricing),
    );
    expect(profits).toEqual([
      dollars('2,500'),
      dollars('2,533'),
      dollars('2,740'),
      dollars('2,410'),
    ]);
  });

  it('serves every big-load customer once there are machines to spare', () => {
    const staffed = laundromatBusiness({ jumboPercent: 40 }, attendants(3));
    expect(quoteBusinessDay(staffed, pricing)).toMatchObject({
      served: 550,
      revenueCents: dollars('4,543'),
    });
  });
});

describe('service washes (BUS20f)', () => {
  it('take machine time first and pay a premium that falls with each level', () => {
    const quotes = [0, 1, 2, 3].map((serviceLevel) =>
      quoteBusinessDay(laundromatBusiness({ serviceLevel }, attendants(3)), pricing),
    );
    expect(quotes.map((quote) => quote.capacity)).toEqual([800, 750, 700, 650]);
    expect(quotes.map((quote) => quote.memberFeesCents)).toEqual([
      dollars('0'),
      dollars('525'),
      dollars('875'),
      dollars('1,102.50'),
    ]);
    expect(quotes.map((quote) => quote.profitCents)).toEqual([
      dollars('2,370'),
      dollars('2,835'),
      dollars('3,125'),
      dollars('3,292.50'),
    ]);
  });

  it('cost walk-ins when the machines are already full', () => {
    const profits = [0, 1, 2, 3].map((serviceLevel) =>
      profitPerDayCents(laundromatBusiness({ serviceLevel }, attendants(3, 4)), pricing),
    );
    expect(profits).toEqual([
      dollars('2,980'),
      dollars('3,155'),
      dollars('3,155'),
      dollars('3,032.50'),
    ]);
  });

  it('run only as many levels as there are attendants', () => {
    const understaffed = laundromatBusiness({ serviceLevel: 3 }, attendants(1));
    expect(quoteBusinessDay(understaffed, pricing).memberFeesCents).toBe(dollars('525'));
  });
});

describe('the manager (BUS20f)', () => {
  it('sets the most profitable jumbo share and leaves service washes alone', () => {
    expect(bestJumboShare(laundromatBusiness(), pricing)).toBe(40);
    const managed = laundromatBusiness(
      { serviceLevel: 1 },
      { staff: { operations: 1, sales: 0, manager: 1 } },
    );
    expect(managerDecisions(managed, pricing).laundromat).toMatchObject({
      jumboPercent: 40,
      serviceLevel: 1,
    });
  });
});

describe('pickup and delivery (BUS20f)', () => {
  it('is locked below Global', () => {
    expect(quotePickup(laundromatBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('1,125,000'),
    });
  });

  it('adds a quarter more customers for 150 times the purchase price', () => {
    const global = laundromatBusiness({}, { stage: 5, ...attendants(3) });
    expect(quotePickup(global, pricing)).toEqual({
      status: 'available',
      priceCents: dollars('1,125,000'),
      profitCents: dollars('2,370'),
      nextProfitCents: dollars('3,164.60'),
    });
  });
});
