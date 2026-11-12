import type { BusinessPricing } from './definition';
import {
  CART_SPOTS,
  MENU_ITEMS,
  type CartSpot,
  type FoodCartRules,
  type MenuItemRule,
} from './foodCartRules';
import type { ActiveFoodCart } from './foodCartState';
import type { OwnedBusiness } from './owned';

export type RunningFoodCart = { readonly rules: FoodCartRules; readonly operation: ActiveFoodCart };

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function foodCartRulesOf(pricing: BusinessPricing): FoodCartRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'food_cart' ? mechanic.foodCart : undefined;
}

export function runningFoodCart(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningFoodCart | undefined {
  const rules = foodCartRulesOf(pricing);
  const operation = business.foodCart;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

function spotCrowdBps(running: RunningFoodCart, spot: CartSpot): number {
  return running.rules.spots[spot][running.operation.crowds[spot]];
}

export function busiestSpot(running: RunningFoodCart): CartSpot {
  return CART_SPOTS.reduce(
    (best, spot) => (spotCrowdBps(running, spot) > spotCrowdBps(running, best) ? spot : best),
    running.operation.spot,
  );
}

function menuBps(running: RunningFoodCart, effect: keyof MenuItemRule): bigint {
  return MENU_ITEMS.filter((item) => running.operation.menu[item] === 'offered').reduce(
    (total, item) => (total * BigInt(running.rules.menu[item][effect])) / BASIS_POINTS,
    BASIS_POINTS,
  );
}

function windowPercent(running: RunningFoodCart): bigint {
  const { secondWindow } = running.rules;
  const installed = running.operation.secondWindow === 'installed';
  return PERCENT + BigInt(installed ? secondWindow.capacityPercent : 0);
}

export type FoodCartDay = {
  readonly demandBps: bigint;
  readonly capacityBps: bigint;
  readonly priceBps: bigint;
};

export function foodCartDay(running: RunningFoodCart): FoodCartDay {
  const crowd = BigInt(spotCrowdBps(running, running.operation.spot));
  return {
    demandBps: (crowd * menuBps(running, 'demandBps')) / BASIS_POINTS,
    capacityBps: (menuBps(running, 'serviceBps') * windowPercent(running)) / PERCENT,
    priceBps: menuBps(running, 'priceBps'),
  };
}
