import { dollars } from '@/domain/money';
import { coffeeKioskBusiness, coffeeKioskDefinition } from '@/domain/testCoffeeKiosk';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { bestRushPlan } from './coffeeKiosk';
import { quoteOrderAhead } from './coffeeKioskQuotes';
import { profitPerDayCents, quoteBusinessDay } from './core';
import { NO_RUSH, serveWithRush } from './rush';
import { managerDecisions } from './staff';

const pricing = { definition: coffeeKioskDefinition, rules: businessRules };
const staffed = { staff: { operations: 2, sales: 1, manager: 0 } };

describe('a coffee kiosk at stage 1 (BUS20e)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('coffee_kiosk');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 550,
      capacity: 500,
      served: 500,
    });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('1,600'));
  });
});

describe('the morning rush (BUS20e)', () => {
  it('serves everyone the day can hold when there is no rush', () => {
    expect(serveWithRush({ demand: 550n, capacity: 500n }, NO_RUSH)).toEqual({
      rushCustomers: 0n,
      rushServed: 0n,
      served: 500n,
    });
  });

  it('loses the rush customers the kiosk cannot serve in time', () => {
    expect(quoteBusinessDay(coffeeKioskBusiness(), pricing)).toMatchObject({
      demand: 550,
      capacity: 500,
      served: 478,
      profitCents: dollars('1,517.28'),
    });
  });

  it('serves the whole rush by brewing ahead, for a few customers fewer', () => {
    const prebatch = coffeeKioskBusiness({ plan: 'prebatch' });
    expect(quoteBusinessDay(prebatch, pricing)).toMatchObject({
      demand: 522,
      served: 500,
      profitCents: dollars('1,600'),
    });
  });

  it('never serves more than the day’s capacity, whatever the plan', () => {
    const express = coffeeKioskBusiness({ plan: 'express' });
    expect(quoteBusinessDay(express, pricing)).toMatchObject({
      served: 500,
      priceCents: dollars('4.41'),
      profitCents: dollars('1,505'),
    });
  });

  it('pays for the express menu once the kiosk has capacity to spare', () => {
    const profits = (['standard', 'prebatch', 'express'] as const).map((plan) =>
      profitPerDayCents(coffeeKioskBusiness({ plan }, staffed), pricing),
    );
    expect(profits).toEqual([dollars('1,627.68'), dollars('1,654'), dollars('1,654.24')]);
  });
});

describe('bean grades (BUS20e)', () => {
  it('sell for more, cost more a cup and draw fewer customers as they improve', () => {
    const single = coffeeKioskBusiness({ grade: 'single_origin', plan: 'prebatch' });
    expect(quoteBusinessDay(single, pricing)).toMatchObject({
      demand: 496,
      served: 496,
      priceCents: dollars('5.29'),
      costPerServedCents: dollars('1.17'),
      profitCents: dollars('1,763.52'),
    });
    const reserve = coffeeKioskBusiness({ grade: 'reserve', plan: 'prebatch' });
    expect(quoteBusinessDay(reserve, pricing)).toMatchObject({
      demand: 418,
      priceCents: dollars('6.21'),
      costPerServedCents: dollars('1.68'),
      profitCents: dollars('1,613.54'),
    });
  });
});

describe('the manager (BUS20e)', () => {
  it('picks the most profitable rush plan and leaves the beans alone', () => {
    expect(bestRushPlan(coffeeKioskBusiness(), pricing)).toBe('prebatch');
    expect(bestRushPlan(coffeeKioskBusiness({}, staffed), pricing)).toBe('express');
    const managed = coffeeKioskBusiness(
      { grade: 'reserve' },
      { staff: { operations: 0, sales: 0, manager: 1 } },
    );
    expect(managerDecisions(managed, pricing).coffeeKiosk).toMatchObject({
      grade: 'reserve',
      plan: 'prebatch',
    });
  });

  it('changes nothing without a manager', () => {
    const unmanaged = coffeeKioskBusiness();
    expect(managerDecisions(unmanaged, pricing).coffeeKiosk).toEqual(unmanaged.coffeeKiosk);
  });
});

describe('order-ahead (BUS20e)', () => {
  it('is locked below Global', () => {
    expect(quoteOrderAhead(coffeeKioskBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('600,000'),
    });
  });

  it('adds half again to rush capacity for 150 times the purchase price', () => {
    expect(quoteOrderAhead(coffeeKioskBusiness({}, { stage: 5 }), pricing)).toEqual({
      status: 'available',
      priceCents: dollars('600,000'),
      profitCents: dollars('1,517.28'),
      nextProfitCents: dollars('1,600'),
    });
  });
});
