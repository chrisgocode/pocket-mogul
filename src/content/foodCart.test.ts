import { economyV3 } from './economy-v3';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type FoodCartInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'food_cart' }
>;

function foodCartOf(content: ContentInput): FoodCartInput {
  const mechanic = content.businesses.find((business) => business.id === 'food_cart')?.mechanic;
  if (mechanic?.kind !== 'food_cart') throw new Error('The Food Cart has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (foodCart: FoodCartInput) => void) => {
  const content: ContentInput = structuredClone(economyV3);
  mutate(foodCartOf(content));
  return findContentIssues(content);
};

describe('the Food Cart mechanic in content (BUS20d)', () => {
  it('gives only the Food Cart a spot and menu, unlocked at Local', () => {
    const carts = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'food_cart',
    );
    expect(carts.map((business) => business.id)).toEqual(['food_cart']);
    expect(foodCartOf(economyV3)).toMatchObject({
      unlockStage: 2,
      forecastDays: 1,
      secondWindow: { stage: 5, capacityPercent: 30 },
    });
  });

  it('keeps the catalog in the same order as the economy before it', () => {
    const ids = getContent().businesses.map((business) => business.id);
    expect(ids.slice(0, 3)).toEqual(['vending', 'food_cart', 'coffee_kiosk']);
    expect(ids).toHaveLength(12);
  });

  it('passes validation as bundled', () => {
    expect(findContentIssues(economyV3)).toEqual([]);
  });

  it('rejects crowd chances that do not add up and spots that shrink with the crowd', () => {
    expect(
      issuesFor((foodCart) => {
        foodCart.crowdChanceBps.busy = 2000;
        foodCart.spots.stadium.busy = 2000;
      }),
    ).toEqual([
      'Business food_cart crowd chances must add up to 100%',
      'Business food_cart every spot must draw more customers as its crowd grows',
    ]);
  });

  it('rejects a mechanic or second window at a stage that does not fit', () => {
    expect(
      issuesFor((foodCart) => {
        foodCart.unlockStage = 6;
        foodCart.secondWindow.stage = 1;
      }),
    ).toEqual([
      'Business food_cart mechanic must unlock at a stage that exists',
      'Business food_cart second window must unlock at a stage after the mechanic',
    ]);
  });
});
