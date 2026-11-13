import { dollars } from '@/domain/money';
import { bakeryBusiness, bakeryDefinition, bakeryRules } from '@/domain/testBakery';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { bestBakeLevel, openOffer, startBakeryDay } from './bakery';
import { runningBakery } from './bakeryDemand';
import { wholesaleOfferOn } from './bakeryOffers';
import { quoteCentralKitchen } from './bakeryQuotes';
import { profitPerDayCents, quoteBusinessDay } from './core';

const pricing = { definition: bakeryDefinition, rules: businessRules };
const draw = { seed: 'bake', businessId: 'bakery', rules: bakeryRules };
const threeOvens = { units: 3 };
const cafeOrder = { clientId: 'corner_cafe', ordersPerDay: 450, priceBps: 7500, endsDay: 9 };

const offerFor = (business: ReturnType<typeof bakeryBusiness>, day: number) => {
  const running = runningBakery(business, pricing);
  return running === undefined ? undefined : openOffer(running, { draw, day });
};

describe('a bakery at stage 1 (BUS20g)', () => {
  it('runs on the shared core only and pays nothing for unsold orders', () => {
    const base = ownedBusiness('bakery', threeOvens);
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 2420,
      capacity: 3000,
      served: 2420,
      profitCents: dollars('64,976'),
    });
  });
});

describe('the oven schedule (BUS20g)', () => {
  it('earns the shared-core profit while everything baked sells', () => {
    expect(profitPerDayCents(bakeryBusiness(), pricing)).toBe(dollars('28,000'));
  });

  it('pays the cost of every order that goes stale', () => {
    const full = quoteBusinessDay(bakeryBusiness({}, threeOvens), pricing);
    expect(full).toMatchObject({
      capacity: 3000,
      served: 2420,
      customerCostsCents: dollars('21,600'),
      profitCents: dollars('60,800'),
    });
  });

  it('earns the most when the bake level matches what sells', () => {
    const profits = [60, 70, 80, 90, 100].map((bakePercent) =>
      profitPerDayCents(bakeryBusiness({ bakePercent }, threeOvens), pricing),
    );
    expect(profits).toEqual([
      dollars('44,640'),
      dollars('54,480'),
      dollars('64,320'),
      dollars('62,960'),
      dollars('60,800'),
    ]);
    expect(bestBakeLevel(bakeryBusiness({}, threeOvens), pricing)).toBe(80);
    expect(bestBakeLevel(bakeryBusiness(), pricing)).toBe(100);
  });
});

describe('wholesale orders (BUS20g)', () => {
  it('are baked before retail and paid at their own price every day', () => {
    const taking = bakeryBusiness({ orders: [cafeOrder] }, threeOvens);
    expect(quoteBusinessDay(taking, pricing)).toMatchObject({
      capacity: 2550,
      served: 2420,
      memberFeesCents: dollars('13,500'),
      profitCents: dollars('74,300'),
    });
  });

  it('cost retail sales when the ovens are already full', () => {
    const small = { ...cafeOrder, ordersPerDay: 150 };
    expect(profitPerDayCents(bakeryBusiness({ orders: [small] }), pricing)).toBe(dollars('26,500'));
  });

  it('draws the same offer for both days of a period and a new one after', () => {
    expect(wholesaleOfferOn(draw, 0)).toEqual({
      id: 0,
      clientId: 'corner_cafe',
      sizePercent: 10,
      priceBps: 8500,
      days: 7,
    });
    expect(wholesaleOfferOn(draw, 1)).toEqual(wholesaleOfferOn(draw, 0));
    expect(wholesaleOfferOn(draw, 2)).toMatchObject({ id: 1, clientId: 'harbor_hotel' });
  });

  it('shows no offer once it is answered or the ovens hold two orders', () => {
    expect(offerFor(bakeryBusiness(), 0)).toMatchObject({ id: 0 });
    expect(offerFor(bakeryBusiness({ answeredOffer: 0 }), 1)).toBeUndefined();
    expect(offerFor(bakeryBusiness({ answeredOffer: 0 }), 2)).toMatchObject({ id: 1 });
    expect(offerFor(bakeryBusiness({ orders: [cafeOrder, cafeOrder] }), 0)).toBeUndefined();
  });

  it('end on their last day', () => {
    const taking = bakeryBusiness({ orders: [cafeOrder] }, threeOvens);
    const before = startBakeryDay(taking, { pricing, day: 8 });
    const after = startBakeryDay(taking, { pricing, day: 9 });
    expect(before.bakery).toMatchObject({ orders: [cafeOrder] });
    expect(after.bakery).toMatchObject({ orders: [] });
  });
});

describe('the manager (BUS20g)', () => {
  it('sets the most profitable bake level each day and leaves offers alone', () => {
    const managed = bakeryBusiness(
      {},
      { ...threeOvens, staff: { operations: 0, sales: 0, manager: 1 } },
    );
    expect(startBakeryDay(managed, { pricing, day: 1 }).bakery).toMatchObject({
      bakePercent: 80,
      orders: [],
      answeredOffer: -1,
    });
    const unmanaged = bakeryBusiness({}, threeOvens);
    expect(startBakeryDay(unmanaged, { pricing, day: 1 }).bakery).toMatchObject({
      bakePercent: 100,
    });
  });
});

describe('the central kitchen (BUS20g)', () => {
  it('is locked below Global', () => {
    expect(quoteCentralKitchen(bakeryBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('15,000,000'),
    });
  });

  it('adds 30 percent capacity for 150 times the purchase price', () => {
    expect(quoteCentralKitchen(bakeryBusiness({}, { stage: 5 }), pricing)).toEqual({
      status: 'available',
      priceCents: dollars('15,000,000'),
      profitCents: dollars('28,000'),
      nextProfitCents: dollars('29,840'),
    });
  });
});
