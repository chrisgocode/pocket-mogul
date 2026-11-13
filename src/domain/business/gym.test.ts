import { dollars } from '@/domain/money';
import { gymBusiness, gymDefinition } from '@/domain/testGym';
import { businessRules, ownedBusiness } from '@/domain/testRules';

import { profitPerDayCents, quoteBusinessDay } from './core';
import { gymJoinsPerDay, gymMemberLimit, startGymDay } from './gym';
import { quoteAllHours } from './gymQuotes';

const pricing = { definition: gymDefinition, rules: businessRules };
const threeStudios = { units: 3 };
const managed = { ...threeStudios, staff: { operations: 0, sales: 0, manager: 1 } };

const membersAfter = (business: ReturnType<typeof gymBusiness>) => {
  const { gym } = startGymDay(business, pricing);
  return gym.status === 'active' ? gym.members : undefined;
};

describe('a gym at stage 1 (BUS20h)', () => {
  it('runs on the shared core only', () => {
    const base = ownedBusiness('gym_chain');
    expect(quoteBusinessDay(base, pricing)).toMatchObject({
      demand: 22_000,
      capacity: 20_000,
      served: 20_000,
    });
    expect(profitPerDayCents(base, pricing)).toBe(dollars('200,000'));
  });
});

describe('members (BUS20h)', () => {
  it('pay the tier on sale every day and use studio time before visitors', () => {
    const quotes = (['basic', 'plus', 'elite'] as const).map((tier) =>
      quoteBusinessDay(gymBusiness({ members: 20_000, tier }, threeStudios), pricing),
    );
    expect(quotes.map((quote) => quote.capacity)).toEqual([50_000, 50_000, 50_000]);
    expect(quotes.map((quote) => quote.memberFeesCents)).toEqual([
      dollars('60,000'),
      dollars('90,000'),
      dollars('130,000'),
    ]);
    expect(quotes[0]?.profitCents).toBe(dollars('490,800'));
  });

  it('cost day-pass sales when the studios are already full', () => {
    const crowded = gymBusiness({ members: 8000 });
    expect(quoteBusinessDay(crowded, pricing)).toMatchObject({
      capacity: 16_000,
      served: 16_000,
      profitCents: dollars('164,000'),
    });
  });

  it('join every day and lose the tier’s share of members every day', () => {
    expect(gymJoinsPerDay(gymBusiness({}, threeStudios), pricing)).toBe(900);
    expect(membersAfter(gymBusiness({}, threeStudios))).toBe(900);
    expect(membersAfter(gymBusiness({ members: 20_000 }, threeStudios))).toBe(20_300);
    expect(membersAfter(gymBusiness({ members: 20_000, tier: 'elite' }, threeStudios))).toBe(
      19_300,
    );
  });

  it('never outgrow the studios', () => {
    expect(gymMemberLimit(gymBusiness(), pricing)).toBe(40_000);
    expect(membersAfter(gymBusiness({ members: 39_990, classLevel: 3 }))).toBe(36_400);
  });

  it('stop changing while the business is closed', () => {
    expect(membersAfter(gymBusiness({ members: 500 }, { status: 'closed' }))).toBe(500);
  });
});

describe('classes (BUS20h)', () => {
  it('keep more members each level and take studio time', () => {
    const withClasses = gymBusiness({ members: 20_000, classLevel: 3 }, threeStudios);
    expect(membersAfter(withClasses)).toBe(20_600);
    expect(quoteBusinessDay(withClasses, pricing)).toMatchObject({
      capacity: 44_600,
      served: 44_600,
      profitCents: dollars('445,200'),
    });
  });
});

describe('the manager (BUS20h)', () => {
  it('adds a class level a day while studios have room', () => {
    const next = startGymDay(gymBusiness({ members: 1000 }, managed), pricing);
    expect(next.gym).toMatchObject({ classLevel: 1, tier: 'basic' });
  });

  it('trims a class level a day when visitors are turned away', () => {
    const crowded = gymBusiness({ members: 1000, classLevel: 2 }, { staff: managed.staff });
    expect(startGymDay(crowded, pricing).gym).toMatchObject({ classLevel: 1 });
  });

  it('leaves classes alone without a manager', () => {
    const next = startGymDay(gymBusiness({ members: 1000, classLevel: 2 }, threeStudios), pricing);
    expect(next.gym).toMatchObject({ classLevel: 2 });
  });
});

describe('24-hour access (BUS20h)', () => {
  it('is locked below Global', () => {
    expect(quoteAllHours(gymBusiness(), pricing)).toEqual({
      status: 'locked',
      unlockStage: 5,
      priceCents: dollars('150,000,000'),
    });
  });

  it('adds 20 percent capacity for 150 times the purchase price', () => {
    expect(quoteAllHours(gymBusiness({}, { stage: 5 }), pricing)).toEqual({
      status: 'available',
      priceCents: dollars('150,000,000'),
      profitCents: dollars('200,000'),
      nextProfitCents: dollars('224,000'),
    });
  });
});
