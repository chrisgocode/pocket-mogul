import { dollars } from '@/domain/money';
import { foodCartBusiness, foodCartDefinition, foodCartRules } from '@/domain/testFoodCart';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { profitPerDayCents, quoteBusinessDay } from './core';
import { startFoodCartDay } from './foodCart';
import { crowdForecast, crowdsOn } from './foodCartCrowds';
import type { Crowd } from './foodCartRules';
import type { Crowds } from './foodCartState';
import { quoteSecondWindow } from './foodCartQuotes';

const pricing = { definition: foodCartDefinition, rules: businessRules };
const draw = { seed: 'cart', businessId: 'food_cart', rules: foodCartRules };
const manager = { operations: 0, sales: 0, manager: 1 };

const everywhere = (crowd: Crowd): Crowds => ({
  park: crowd,
  offices: crowd,
  campus: crowd,
  market: crowd,
  stadium: crowd,
});

const menuOf = (offered: readonly ('combo' | 'snacks' | 'express')[]) =>
  ({
    combo: offered.includes('combo') ? 'offered' : 'withdrawn',
    snacks: offered.includes('snacks') ? 'offered' : 'withdrawn',
    express: offered.includes('express') ? 'offered' : 'withdrawn',
  }) as const;

describe('a food cart at stage 1 (BUS20d)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('food_cart');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({ demand: 88, capacity: 80, served: 80 });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('500'));
  });
});

describe('the spot (BUS20d)', () => {
  it('earns the shared-core profit on a steady day in the park with a short menu', () => {
    expect(profitPerDayCents(foodCartBusiness(), pricing)).toBe(dollars('500'));
  });

  it('draws customers from the crowd at the spot where the cart is parked', () => {
    const crowds = { ...everywhere('steady'), stadium: 'busy' as const, park: 'quiet' as const };
    expect(quoteBusinessDay(foodCartBusiness({ crowds }), pricing).demand).toBe(70);
    expect(quoteBusinessDay(foodCartBusiness({ crowds, spot: 'stadium' }), pricing).demand).toBe(
      193,
    );
    expect(quoteBusinessDay(foodCartBusiness({ crowds, spot: 'offices' }), pricing).demand).toBe(
      92,
    );
  });

  it('draws the same crowds for the same seed and day, and different ones on other days', () => {
    expect(crowdsOn(draw, 0)).toEqual({
      park: 'steady',
      offices: 'busy',
      campus: 'quiet',
      market: 'busy',
      stadium: 'quiet',
    });
    expect(crowdsOn(draw, 0)).toEqual(crowdsOn(draw, 0));
    expect(crowdsOn(draw, 1)).toEqual({ ...everywhere('quiet'), stadium: 'busy' });
    expect(crowdsOn({ ...draw, seed: 'other' }, 0)).not.toEqual(crowdsOn(draw, 0));
  });

  it('forecasts tomorrow with the crowds that day will draw', () => {
    expect(crowdForecast(draw, 3)).toEqual([crowdsOn(draw, 4)]);
  });
});

describe('the menu (BUS20d)', () => {
  it('pays for combo meals and street snacks on a quiet day', () => {
    const crowds = everywhere('quiet');
    const short = profitPerDayCents(foodCartBusiness({ crowds }), pricing);
    const combo = foodCartBusiness({ crowds, menu: menuOf(['combo']) });
    const snacks = foodCartBusiness({ crowds, menu: menuOf(['snacks']) });
    expect(short).toBe(dollars('426.50'));
    expect(quoteBusinessDay(combo, pricing)).toMatchObject({
      capacity: 64,
      served: 64,
      priceCents: dollars('10.80'),
      profitCents: dollars('497.60'),
    });
    expect(quoteBusinessDay(snacks, pricing)).toMatchObject({
      demand: 91,
      served: 80,
      priceCents: dollars('8.28'),
      profitCents: dollars('442.40'),
    });
  });

  it('loses money on the same items when the line is already full', () => {
    const crowds = everywhere('busy');
    const short = profitPerDayCents(foodCartBusiness({ crowds }), pricing);
    const combo = foodCartBusiness({ crowds, menu: menuOf(['combo']) });
    const snacks = foodCartBusiness({ crowds, menu: menuOf(['snacks']) });
    expect(short).toBe(dollars('500'));
    expect(profitPerDayCents(combo, pricing)).toBe(dollars('497.60'));
    expect(profitPerDayCents(snacks, pricing)).toBe(dollars('442.40'));
  });

  it('serves a busy line faster with grab-and-go wraps, and turns customers away with them on a quiet day', () => {
    const express = menuOf(['express']);
    const busy = foodCartBusiness({ crowds: everywhere('busy'), menu: express });
    const quiet = foodCartBusiness({ crowds: everywhere('quiet'), menu: express });
    expect(quoteBusinessDay(busy, pricing)).toMatchObject({
      demand: 99,
      capacity: 96,
      served: 96,
      profitCents: dollars('617.60'),
    });
    expect(profitPerDayCents(quiet, pricing)).toBe(dollars('375.05'));
  });
});

describe('the manager (BUS20d)', () => {
  it('parks at the busiest spot each morning', () => {
    const managed = foodCartBusiness({}, { staff: manager });
    const days = [0, 1].map((day) => startFoodCartDay(managed, { pricing, seed: 'cart', day }));
    expect(days.map((business) => business.foodCart)).toMatchObject([
      { spot: 'market' },
      { spot: 'stadium' },
    ]);
  });

  it('leaves the cart where the player parked it without a manager, with the new crowds', () => {
    const started = startFoodCartDay(foodCartBusiness(), { pricing, seed: 'cart', day: 1 });
    expect(started.foodCart).toMatchObject({ spot: 'park', crowds: crowdsOn(draw, 1) });
  });

  it('stays put while the business is closed', () => {
    const closed = foodCartBusiness({}, { staff: manager, status: 'closed' });
    const started = startFoodCartDay(closed, { pricing, seed: 'cart', day: 1 });
    expect(started.foodCart).toMatchObject({ spot: 'park' });
  });
});

describe('the second window (BUS20d)', () => {
  it('is locked below Global', () => {
    expect(quoteSecondWindow(foodCartBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('187,500'),
    });
  });

  it('adds 30 percent capacity for 150 times the purchase price', () => {
    const global = foodCartBusiness({ crowds: everywhere('busy') }, { stage: 5 });
    expect(quoteSecondWindow(global, pricing)).toEqual({
      status: 'available',
      priceCents: dollars('187,500'),
      profitCents: dollars('500'),
      nextProfitCents: dollars('676.40'),
    });
    const installed = foodCartBusiness({ crowds: everywhere('busy'), secondWindow: 'installed' });
    expect(quoteBusinessDay(installed, pricing)).toMatchObject({ capacity: 104, served: 104 });
  });
});
