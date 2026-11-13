import { dollars } from '@/domain/money';
import { factoryBusiness, factoryDefinition, factoryRules } from '@/domain/testFactory';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { profitPerDayCents, quoteBusinessDay } from './core';
import { openBulkOffer, startFactoryDay } from './factory';
import { runningFactory } from './factoryDemand';
import { bulkOfferOn } from './factoryOffers';
import { quoteAutomation } from './factoryQuotes';
import { PRODUCTS } from './factoryRules';

const pricing = { definition: factoryDefinition, rules: businessRules };
const draw = { seed: 'make', businessId: 'manufacturer', rules: factoryRules };
const railOrder = {
  clientId: 'northfield_rail',
  parcelsPerDay: 640,
  rateCents: dollars('6,000'),
  penaltyCents: dollars('2,500'),
  endsDay: 9,
};

const offerFor = (business: ReturnType<typeof factoryBusiness>, day: number) => {
  const running = runningFactory(business, pricing);
  return running === undefined ? undefined : openBulkOffer(running, { draw, day });
};

describe('a factory at stage 1 (BUS20j)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('manufacturer');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 1760,
      capacity: 1600,
      served: 1600,
    });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('5,000,000'));
  });
});

describe('products (BUS20j)', () => {
  it('sell for more to fewer buyers at a higher cost as they get finer', () => {
    expect(quoteBusinessDay(factoryBusiness({ product: 'precision' }), pricing)).toMatchObject({
      demand: 1232,
      served: 1232,
      priceCents: dollars('6,250'),
      costPerServedCents: dollars('1,350'),
      profitCents: dollars('4,836,800'),
    });
    expect(quoteBusinessDay(factoryBusiness({ product: 'custom' }), pricing)).toMatchObject({
      demand: 792,
      priceCents: dollars('8,000'),
      profitCents: dollars('3,888,600'),
    });
  });

  it('pay once buyers outnumber what the lines can make', () => {
    const sales = { staff: { operations: 0, sales: 2, manager: 0 } };
    const profits = PRODUCTS.map((product) =>
      profitPerDayCents(factoryBusiness({ product }, sales), pricing),
    );
    expect(profits).toEqual([dollars('4,040,000'), dollars('5,680,000'), dollars('4,451,325')]);
  });

  it('halve output while the lines retool, then recover', () => {
    const retooling = factoryBusiness({ retoolDaysLeft: 2 });
    expect(quoteBusinessDay(retooling, pricing)).toMatchObject({
      capacity: 800,
      profitCents: dollars('1,900,000'),
    });
    const nextDay = startFactoryDay(retooling, { pricing, day: 1 });
    expect(nextDay.factory).toMatchObject({ retoolDaysLeft: 1 });
    const dayAfter = startFactoryDay(nextDay, { pricing, day: 2 });
    expect(dayAfter.factory).toMatchObject({ retoolDaysLeft: 0 });
    expect(quoteBusinessDay(dayAfter, pricing).capacity).toBe(1600);
  });
});

describe('bulk orders (BUS20j)', () => {
  it('are made before open-market sales and paid at their own rate', () => {
    const taking = factoryBusiness({ orders: [railOrder] });
    expect(quoteBusinessDay(taking, pricing)).toMatchObject({
      capacity: 960,
      served: 960,
      contractParcels: 640,
      missedParcels: 0,
      contractRevenueCents: dollars('3,840,000'),
      profitCents: dollars('5,640,000'),
    });
  });

  it('leave a smaller open market where a finer product pays', () => {
    const profits = PRODUCTS.map((product) =>
      profitPerDayCents(factoryBusiness({ product, orders: [railOrder] }), pricing),
    );
    expect(profits).toEqual([dollars('5,640,000'), dollars('6,480,000'), dollars('6,720,600')]);
  });

  it('cost a penalty for every batch the lines fail to make', () => {
    const overbooked = factoryBusiness({ orders: [railOrder, railOrder], retoolDaysLeft: 1 });
    expect(quoteBusinessDay(overbooked, pricing)).toMatchObject({
      capacity: 0,
      contractParcels: 800,
      missedParcels: 480,
      penaltiesCents: dollars('1,200,000'),
      profitCents: dollars('1,500,000'),
    });
  });

  it('draws one offer for each three-day period', () => {
    expect(bulkOfferOn(draw, 0)).toEqual({
      id: 0,
      clientId: 'northfield_rail',
      sizePercent: 20,
      rateBps: 11_000,
      days: 9,
    });
    expect(bulkOfferOn(draw, 2)).toEqual(bulkOfferOn(draw, 0));
    expect(bulkOfferOn(draw, 3)).toMatchObject({ id: 1, clientId: 'summit_tools' });
  });

  it('shows no offer once it is answered or the lines hold two orders', () => {
    expect(offerFor(factoryBusiness(), 0)).toMatchObject({ id: 0 });
    expect(offerFor(factoryBusiness({ answeredOffer: 0 }), 2)).toBeUndefined();
    expect(offerFor(factoryBusiness({ answeredOffer: 0 }), 3)).toMatchObject({ id: 1 });
    expect(offerFor(factoryBusiness({ orders: [railOrder, railOrder] }), 0)).toBeUndefined();
  });

  it('end on their last day', () => {
    const taking = factoryBusiness({ orders: [railOrder] });
    expect(startFactoryDay(taking, { pricing, day: 8 }).factory).toMatchObject({
      orders: [railOrder],
    });
    expect(startFactoryDay(taking, { pricing, day: 9 }).factory).toMatchObject({ orders: [] });
  });
});

describe('automation (BUS20j)', () => {
  it('is locked below Global', () => {
    expect(quoteAutomation(factoryBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('7,500,000,000'),
    });
  });

  it('cuts the cost of a batch by a fifth for 150 times the purchase price', () => {
    expect(quoteAutomation(factoryBusiness({}, { stage: 5 }), pricing)).toEqual({
      status: 'available',
      priceCents: dollars('7,500,000,000'),
      profitCents: dollars('5,000,000'),
      nextProfitCents: dollars('5,360,000'),
    });
  });
});
