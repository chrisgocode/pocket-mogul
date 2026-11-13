import { profitPerDayCents } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import { crowdDraw } from '@/domain/business/foodCart';
import { crowdForecast } from '@/domain/business/foodCartCrowds';
import {
  foodCartRulesOf,
  runningFoodCart,
  type RunningFoodCart,
} from '@/domain/business/foodCartDemand';
import { quoteSecondWindow, type SecondWindowQuote } from '@/domain/business/foodCartQuotes';
import {
  CART_SPOTS,
  MENU_ITEMS,
  type CartSpot,
  type Crowd,
  type MenuItem,
} from '@/domain/business/foodCartRules';
import type { Crowds, MenuOffer } from '@/domain/business/foodCartState';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const FOOD_CART_COACH_MARK: CoachMark = 'food_cart';

export type CartSpotView = {
  readonly spot: CartSpot;
  readonly parked: boolean;
  readonly crowd: Crowd;
  readonly customersPercent: number;
  readonly forecast: readonly Crowd[];
};

export type MenuItemView = {
  readonly item: MenuItem;
  readonly offer: MenuOffer;
  readonly customersPercent: number;
  readonly pricePercent: number;
  readonly speedPercent: number;
  readonly switchProfitCents: MoneyCents;
};

export type AvailableSecondWindow = Extract<SecondWindowQuote, { status: 'available' }> &
  Affordability;
export type SecondWindowOption =
  | Exclude<SecondWindowQuote, { status: 'available' }>
  | AvailableSecondWindow;

export type FoodCartView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly spots: readonly CartSpotView[];
      readonly menu: readonly MenuItemView[];
      readonly coachMark: 'show' | 'seen';
      readonly secondWindow: SecondWindowOption;
    };

type FoodCartContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

function spotViews(running: RunningFoodCart, forecast: readonly Crowds[]): CartSpotView[] {
  const { rules, operation } = running;
  return CART_SPOTS.map((spot) => ({
    spot,
    parked: operation.spot === spot,
    crowd: operation.crowds[spot],
    customersPercent: rules.spots[spot][operation.crowds[spot]] / BPS_PER_PERCENT,
    forecast: forecast.map((crowds) => crowds[spot]),
  }));
}

function switchProfitCents(context: FoodCartContext, change: SwitchedItem): MoneyCents {
  const { owned, pricing } = context;
  const { operation, item } = change;
  const offer: MenuOffer = operation.menu[item] === 'offered' ? 'withdrawn' : 'offered';
  const switched = {
    ...owned,
    foodCart: { ...operation, menu: { ...operation.menu, [item]: offer } },
  };
  return moneyCents(profitPerDayCents(switched, pricing) - profitPerDayCents(owned, pricing));
}

type SwitchedItem = {
  readonly operation: RunningFoodCart['operation'];
  readonly item: MenuItem;
};

function menuViews(running: RunningFoodCart, context: FoodCartContext): MenuItemView[] {
  const { rules, operation } = running;
  return MENU_ITEMS.map((item) => ({
    item,
    offer: operation.menu[item],
    customersPercent: rules.menu[item].demandBps / BPS_PER_PERCENT,
    pricePercent: rules.menu[item].priceBps / BPS_PER_PERCENT,
    speedPercent: rules.menu[item].serviceBps / BPS_PER_PERCENT,
    switchProfitCents: switchProfitCents(context, { operation, item }),
  }));
}

function secondWindowOption(context: FoodCartContext): SecondWindowOption {
  const quote = quoteSecondWindow(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectFoodCart(context: FoodCartContext): FoodCartView | undefined {
  const { owned, pricing } = context;
  const rules = foodCartRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningFoodCart(owned, pricing);
  const draw = crowdDraw(owned, context);
  if (running === undefined || draw === undefined) {
    return { status: 'locked', unlockStage: rules.unlockStage };
  }
  const day = businessDayOf(context.simulationMs, pricing.rules);
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    spots: spotViews(running, crowdForecast(draw, day)),
    menu: menuViews(running, context),
    coachMark: context.seenCoachMarks.includes(FOOD_CART_COACH_MARK) ? 'seen' : 'show',
    secondWindow: secondWindowOption(context),
  };
}
