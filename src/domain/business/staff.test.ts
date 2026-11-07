import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { profitPerDayCents, quoteBusinessDay } from './core';
import { quoteStaff } from './staff';
import { settleBusinesses } from './treasury';

const pricing = { definition: vendingDefinition, rules: businessRules };
const economy = { catalog: [vendingDefinition], rules: businessRules };
const staffed = (staff: Partial<{ operations: number; sales: number; manager: number }>) =>
  ownedBusiness('vending', {
    stage: 2,
    staff: { operations: 0, sales: 0, manager: 0, ...staff },
  });

const settle = (business: ReturnType<typeof staffed>, elapsedMs: number) =>
  settleBusinesses([business], { fromMs: 0, elapsedMs, economy });

describe('staff effects (BUS13)', () => {
  it('adds 20 percent capacity per operations hire and pays 4 percent of catalog revenue', () => {
    expect(quoteBusinessDay(staffed({ operations: 1 }), pricing)).toMatchObject({
      capacity: 120,
      served: 110,
      wagesCents: dollars('5.60'),
      profitCents: dollars('106'),
    });
  });

  it('adds 15 percent demand per sales hire and pays 6 percent of catalog revenue', () => {
    expect(quoteBusinessDay(staffed({ sales: 1 }), pricing)).toMatchObject({
      demand: 126,
      served: 100,
      wagesCents: dollars('8.40'),
      profitCents: dollars('91.60'),
    });
  });

  it('adds 10 percent to positive profit after the manager’s 10 percent wage', () => {
    expect(quoteBusinessDay(staffed({ manager: 1 }), pricing)).toMatchObject({
      wagesCents: dollars('14'),
      managerBonusCents: dollars('8.60'),
      profitCents: dollars('94.60'),
    });
  });

  it('adds no bonus to a loss', () => {
    const losing = staffed({ manager: 1, operations: 30 });
    expect(quoteBusinessDay(losing, pricing)).toMatchObject({
      managerBonusCents: dollars('0'),
      profitCents: dollars('-70.40'),
    });
  });
});

describe('a hiring quote', () => {
  it('charges a signing fee of three days of wages', () => {
    expect(quoteStaff(ownedBusiness('vending'), { ...pricing, role: 'operations' })).toEqual({
      status: 'available',
      role: 'operations',
      count: 0,
      cap: 2,
      wageCents: dollars('5.60'),
      signingFeeCents: dollars('16.80'),
      profitCents: dollars('100'),
      nextProfitCents: dollars('106'),
    });
  });

  it('stops at the stage cap', () => {
    const full = ownedBusiness('vending', { staff: { operations: 2, sales: 0, manager: 0 } });
    expect(quoteStaff(full, { ...pricing, role: 'operations' })).toMatchObject({
      status: 'at_cap',
      count: 2,
      cap: 2,
    });
  });

  it('locks the manager until Local, stage 2 (BUS15)', () => {
    expect(quoteStaff(ownedBusiness('vending'), { ...pricing, role: 'manager' })).toEqual({
      status: 'locked',
      role: 'manager',
      unlockStage: 2,
    });
  });
});

describe('the manager at each day boundary (BUS14, AC43)', () => {
  it('sets the most profitable price level when the day ends', () => {
    expect(settle(staffed({ manager: 1 }), 600_000).businesses[0]?.priceLevel).toBe('premium');
  });

  it('leaves the price alone until the boundary', () => {
    expect(settle(staffed({ manager: 1 }), 599_999).businesses[0]?.priceLevel).toBe('standard');
  });

  it('earns the new price from the next day on', () => {
    const settled = settle(staffed({ manager: 1 }), 1_200_000);
    const premium = { ...staffed({ manager: 1 }), priceLevel: 'premium' as const };
    const twoDays =
      profitPerDayCents(staffed({ manager: 1 }), pricing) + profitPerDayCents(premium, pricing);
    expect(settled.toCashCents).toBe(twoDays / 2n);
  });

  it('never deposits, withdraws or changes the payout', () => {
    const managed = { ...staffed({ manager: 1 }), payoutPercent: 30, treasuryCents: dollars('50') };
    const [after] = settle(managed, 6_000_000).businesses;
    expect(after).toMatchObject({ payoutPercent: 30, status: 'open', units: 1, stage: 2 });
  });

  it('decides once per boundary, not again when no time has passed', () => {
    const atBoundary = settleBusinesses([staffed({ manager: 1 })], {
      fromMs: 600_000,
      elapsedMs: 0,
      economy,
    });
    expect(atBoundary.businesses[0]?.priceLevel).toBe('standard');
  });

  it('changes nothing without a manager, offline too', () => {
    expect(settle(staffed({}), 28_800_000).businesses[0]?.priceLevel).toBe('standard');
  });
});
