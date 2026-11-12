import type { BusinessPricing } from './definition';
import { crowdsOn, type CrowdDraw } from './foodCartCrowds';
import { busiestSpot, foodCartRulesOf, runningFoodCart } from './foodCartDemand';
import { HOME_SPOT } from './foodCartRules';
import type { ActiveFoodCart } from './foodCartState';
import type { OwnedBusiness } from './owned';

export type FoodCartDayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

export function crowdDraw(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly seed: string },
): CrowdDraw | undefined {
  const rules = foodCartRulesOf(start.pricing);
  if (rules === undefined) return undefined;
  return { seed: start.seed, businessId: business.definitionId, rules };
}

export function withFoodCartUnlocked(
  business: OwnedBusiness,
  start: FoodCartDayStart,
): OwnedBusiness {
  const draw = crowdDraw(business, start);
  if (draw === undefined || business.foodCart.status === 'active') return business;
  if (business.stage < draw.rules.unlockStage) return business;
  const foodCart: ActiveFoodCart = {
    status: 'active',
    spot: HOME_SPOT,
    crowds: crowdsOn(draw, start.day),
    menu: { combo: 'withdrawn', snacks: 'withdrawn', express: 'withdrawn' },
    secondWindow: 'none',
  };
  return { ...business, foodCart };
}

function withCrowds(business: OwnedBusiness, start: FoodCartDayStart): OwnedBusiness {
  const running = runningFoodCart(business, start.pricing);
  const draw = crowdDraw(business, start);
  if (running === undefined || draw === undefined) return business;
  const drawn = {
    ...running,
    operation: { ...running.operation, crowds: crowdsOn(draw, start.day) },
  };
  const managed = business.staff.manager > 0 && business.status === 'open';
  const spot = managed ? busiestSpot(drawn) : drawn.operation.spot;
  return { ...business, foodCart: { ...drawn.operation, spot } };
}

export function startFoodCartDay(business: OwnedBusiness, start: FoodCartDayStart): OwnedBusiness {
  return withCrowds(withFoodCartUnlocked(business, start), start);
}
