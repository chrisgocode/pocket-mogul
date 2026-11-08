import { dollars } from '@/domain/money';
import {
  activeDelivery,
  contract,
  deliveryBusiness,
  deliveryFlagship,
  deliveryRules,
  offersOf,
} from '@/domain/testDelivery';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { bestPriceLevel, quoteBusinessDay } from './core';
import { endedDeliveryDay, startDeliveryDay, withDeliveryUnlocked } from './delivery';
import { reputationOf } from './deliveryReputation';

const pricing = { definition: deliveryFlagship, rules: businessRules };
const start = { pricing, seed: 'vans', day: 1 };
const crew = (operations: number, manager = 0) => ({
  staff: { operations, sales: 0, manager },
});
const history = (due: number, delivered: number) =>
  Array.from({ length: 10 }, () => ({ due, delivered }));
const vans = (operations: number, units: number) =>
  quoteBusinessDay(deliveryBusiness({}, { ...crew(operations), units }), pricing).capacity;
const stars = (delivered: number) =>
  reputationOf(history(100, delivered), deliveryRules.reputation).stars;
const offersAt = (delivered: number) =>
  offersOf(startDeliveryDay(deliveryBusiness({ history: history(100, delivered) }), start));
const totalParcels = (offers: ReturnType<typeof offersAt>) =>
  offers.reduce((total, offer) => total + offer.parcelsPerDay, 0);
const totalRates = (offers: ReturnType<typeof offersAt>) =>
  offers.reduce((total, offer) => total + offer.rateCents, 0n);

describe('a delivery company at stage 1 (BUS20c)', () => {
  it('runs on the shared core: 10,000 of 11,000 parcels for $60,000 a day', () => {
    expect(quoteBusinessDay(ownedBusiness('delivery'), pricing)).toMatchObject({
      demand: 11_000,
      capacity: 10_000,
      served: 10_000,
      revenueCents: dollars('95,000'),
      customerCostsCents: dollars('21,000'),
      profitCents: dollars('60,000'),
    });
  });

  it('turns the mechanic on at Local with three offers on the board', () => {
    const local = withDeliveryUnlocked(ownedBusiness('delivery', { stage: 2 }), start);
    expect(local.delivery).toMatchObject({ status: 'active', contracts: [], sortingHub: 'none' });
    expect(offersOf(local)).toHaveLength(3);
  });
});

describe('drivers (BUS20c)', () => {
  it('leaves a van without a driver idle', () => {
    expect(quoteBusinessDay(deliveryBusiness({}, crew(0)), pricing).capacity).toBe(0);
  });

  it('lets each driver run two vans and still adds 20% capacity', () => {
    expect(vans(1, 2)).toBe(24_000);
    expect(vans(1, 3)).toBe(24_000);
    expect(vans(2, 3)).toBe(42_000);
  });
});

describe('contracts (BUS20c, AC41)', () => {
  it('serves contracts first and walk-ins only from spare capacity', () => {
    const quote = quoteBusinessDay(
      deliveryBusiness({ contracts: [contract({ parcelsPerDay: 20_000 })] }),
      pricing,
    );
    expect(quote).toMatchObject({
      contractParcels: 20_000,
      missedParcels: 0,
      contractRevenueCents: dollars('240,000'),
      capacity: 4_000,
      served: 4_000,
      customerCostsCents: dollars('50,400'),
      profitCents: dollars('195,800'),
    });
  });

  it('charges the penalty for every missed parcel and serves no walk-ins', () => {
    const over = deliveryBusiness({ contracts: [contract({ parcelsPerDay: 30_000 })] });
    expect(quoteBusinessDay(over, pricing)).toMatchObject({
      contractParcels: 24_000,
      missedParcels: 6_000,
      contractRevenueCents: dollars('288,000'),
      penaltiesCents: dollars('150,000'),
      served: 0,
      profitCents: dollars('55,800'),
    });
  });

  it('serves contracts in acceptance order, so a later one misses', () => {
    const first = contract({ id: '0-0', parcelsPerDay: 20_000, penaltyCents: dollars('40') });
    const second = contract({ id: '0-1', parcelsPerDay: 10_000, penaltyCents: dollars('20') });
    const quote = quoteBusinessDay(deliveryBusiness({ contracts: [first, second] }), pricing);
    expect(quote.penaltiesCents).toBe(dollars('120,000'));
  });

  it('lowers reputation after a short day and ends contracts on their last day', () => {
    const short = deliveryBusiness({
      contracts: [contract({ parcelsPerDay: 30_000, endsDay: 2 })],
      history: history(1_000, 1_000).slice(0, 9),
    });
    const after = activeDelivery(endedDeliveryDay(short, { pricing, day: 1 }));
    expect(after.history.at(-1)).toEqual({ due: 30_000, delivered: 24_000 });
    expect(reputationOf(history(1_000, 1_000), deliveryRules.reputation).stars).toBe(5);
    expect(reputationOf(after.history, deliveryRules.reputation).stars).toBe(2);
    expect(after.contracts).toHaveLength(1);
    expect(endedDeliveryDay(short, { pricing, day: 2 }).delivery).toMatchObject({ contracts: [] });
  });
});

describe('reputation (BUS20c)', () => {
  it('rates the on-time share of the last 10 days from one to five stars', () => {
    expect([100, 99, 95, 85, 70, 69].map(stars)).toEqual([5, 5, 4, 3, 2, 1]);
  });

  it('starts at three stars with no contract parcels due', () => {
    expect(reputationOf(history(0, 0), deliveryRules.reputation)).toEqual({
      stars: 3,
      onTimeBps: undefined,
    });
  });

  it('only counts the last 10 days', () => {
    const old = [...history(100, 0), ...history(100, 100)];
    expect(reputationOf(old, deliveryRules.reputation).stars).toBe(5);
  });
});

describe('the offers board (BUS20c, AC37)', () => {
  it('draws the same offers from the same seed and day', () => {
    const once = offersOf(startDeliveryDay(deliveryBusiness(), start));
    const again = offersOf(startDeliveryDay(deliveryBusiness(), start));
    expect(once).toHaveLength(3);
    expect(again).toEqual(once);
    expect(offersOf(startDeliveryDay(deliveryBusiness(), { ...start, seed: 'other' }))).not.toEqual(
      once,
    );
  });

  it('expires unanswered offers after 2 days and refills the board', () => {
    const posted = offersOf(startDeliveryDay(deliveryBusiness(), start));
    const kept = startDeliveryDay(deliveryBusiness({ offers: posted }), { ...start, day: 2 });
    expect(offersOf(kept)).toEqual(posted);
    const expired = startDeliveryDay(deliveryBusiness({ offers: posted }), { ...start, day: 3 });
    expect(offersOf(expired).map((offer) => offer.id)).toEqual(['3-0', '3-1', '3-2']);
  });

  it('brings bigger offers at better rates with a higher reputation', () => {
    expect(totalParcels(offersAt(100))).toBeGreaterThan(totalParcels(offersAt(50)));
    expect(totalRates(offersAt(100))).toBeGreaterThan(totalRates(offersAt(50)));
  });
});

describe('route planner and sorting hub (BUS20c)', () => {
  it('adds 5% parcels per van per route planner level instead of lowering cost', () => {
    const planned = deliveryBusiness({}, { levels: { quality: 0, efficiency: 4 } });
    expect(quoteBusinessDay(planned, pricing)).toMatchObject({
      capacity: 28_800,
      costPerServedCents: dollars('2.10'),
    });
  });

  it('adds 30% capacity with a sorting hub', () => {
    const hub = deliveryBusiness({ sortingHub: 'installed' });
    expect(quoteBusinessDay(hub, pricing).capacity).toBe(31_200);
  });
});

describe('the manager (BUS14, BUS20c)', () => {
  it('raises the walk-in price, dropping walk-in demand, when contracts fill the vans', () => {
    const idle = deliveryBusiness({}, crew(1, 1));
    const busy = deliveryBusiness({ contracts: [contract({ parcelsPerDay: 20_000 })] }, crew(1, 1));
    expect(bestPriceLevel(idle, pricing)).toBe('standard');
    expect(bestPriceLevel(busy, pricing)).toBe('luxury');
  });
});
