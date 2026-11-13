import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type CoffeeKioskInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'coffee_kiosk' }
>;

function coffeeKioskOf(content: ContentInput): CoffeeKioskInput {
  const mechanic = content.businesses.find((business) => business.id === 'coffee_kiosk')?.mechanic;
  if (mechanic?.kind !== 'coffee_kiosk') throw new Error('The Coffee Kiosk has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (coffeeKiosk: CoffeeKioskInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(coffeeKioskOf(content));
  return findContentIssues(content);
};

describe('the Coffee Kiosk mechanic in content (BUS20e)', () => {
  it('gives only the Coffee Kiosk a rush and beans, unlocked at Local', () => {
    const kiosks = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'coffee_kiosk',
    );
    expect(kiosks.map((business) => business.id)).toEqual(['coffee_kiosk']);
    expect(coffeeKioskOf(economyV2)).toMatchObject({
      unlockStage: 2,
      rushDemandBps: 4500,
      rushWindowBps: 3500,
      orderAhead: { stage: 5, rushCapacityPercent: 50 },
    });
  });

  it('keeps the catalog order and the Food Cart mechanic from the economy before it', () => {
    const businesses = getContent().businesses;
    expect(businesses.slice(0, 3).map((business) => business.id)).toEqual([
      'vending',
      'food_cart',
      'coffee_kiosk',
    ]);
    expect(businesses[1]?.mechanic?.kind).toBe('food_cart');
  });

  it('passes validation as bundled', () => {
    expect(findContentIssues(economyV2)).toEqual([]);
  });

  it('rejects grades that do not rise and a rush no busier than the rest of the day', () => {
    expect(
      issuesFor((coffeeKiosk) => {
        coffeeKiosk.grades.reserve.costBps = 9000;
        coffeeKiosk.rushDemandBps = 3000;
      }),
    ).toEqual([
      'Business coffee_kiosk better bean grades must cost more and sell for more',
      'Business coffee_kiosk the rush must bring a bigger share of customers than its share of the day',
    ]);
  });

  it('rejects a mechanic or order-ahead at a stage that does not fit', () => {
    expect(
      issuesFor((coffeeKiosk) => {
        coffeeKiosk.unlockStage = 6;
        coffeeKiosk.orderAhead.stage = 1;
      }),
    ).toEqual([
      'Business coffee_kiosk mechanic must unlock at a stage that exists',
      'Business coffee_kiosk order-ahead must unlock at a stage after the mechanic',
    ]);
  });
});
