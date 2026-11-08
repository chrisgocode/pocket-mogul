import type { BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { fullStock, restockCents } from '@/domain/business/vending';
import { restockTotalCents } from '@/domain/business/vendingCommands';
import {
  bestMix,
  matchBps,
  runningVending,
  vendingRulesOf,
  type RunningVending,
} from '@/domain/business/vendingDemand';
import { quoteCardReaders, type CardReaderQuote } from '@/domain/business/vendingQuotes';
import {
  HOME_LOCATION,
  VENDING_LOCATIONS,
  type StockMix,
  type VendingLocation,
  type VendingSpot,
} from '@/domain/business/vendingRules';
import type { CoachMark } from '@/domain/coachMarks';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const VENDING_COACH_MARK: CoachMark = 'vending';

export type VendingSpotView = {
  readonly location: VendingLocation;
  readonly machines: number;
  readonly slots: number;
  readonly trafficPercent: number;
  readonly mix: StockMix;
  readonly bestMix: StockMix;
  readonly matchPercent: number;
  readonly stock: number;
  readonly fullStock: number;
  readonly restock: { readonly priceCents: MoneyCents } & Affordability;
  readonly placement: 'home' | 'open' | 'blocked';
};

export type AvailableCardReaders = Extract<CardReaderQuote, { status: 'available' }> &
  Affordability;
export type CardReaderOption =
  | Exclude<CardReaderQuote, { status: 'available' }>
  | AvailableCardReaders;

export type VendingView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly spots: readonly VendingSpotView[];
      readonly restockAll: { readonly priceCents: MoneyCents } & Affordability;
      readonly restockers: number;
      readonly coachMark: 'show' | 'seen';
      readonly cardReaders: CardReaderOption;
    };

type VendingContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seenCoachMarks: readonly string[];
};

function placementOf(placing: {
  readonly location: VendingLocation;
  readonly spot: VendingSpot;
  readonly home: VendingSpot;
  readonly slots: number;
}): VendingSpotView['placement'] {
  if (placing.location === HOME_LOCATION) return 'home';
  const open = placing.home.machines > 0 && placing.spot.machines < placing.slots;
  return open ? 'open' : 'blocked';
}

function spotView(running: RunningVending, location: VendingLocation, treasuryCents: MoneyCents) {
  const { rules, operation } = running;
  const spot = operation.spots[location];
  const rule = rules.locations[location];
  const home = operation.spots[HOME_LOCATION];
  const priceCents = moneyCents(restockCents(rules, { location, spot }));
  return {
    location,
    machines: spot.machines,
    slots: rule.slots,
    trafficPercent: rule.trafficBps / BPS_PER_PERCENT,
    mix: spot.mix,
    bestMix: bestMix(rules, location),
    matchPercent: Math.round(matchBps(rules, { location, mix: spot.mix }) / BPS_PER_PERCENT),
    stock: spot.stock,
    fullStock: fullStock(rules, spot.machines),
    restock: { priceCents, ...affordability(priceCents, treasuryCents) },
    placement: placementOf({ location, spot, home, slots: rule.slots }),
  };
}

function cardReaderOption(context: VendingContext): CardReaderOption {
  const quote = quoteCardReaders(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectVending(context: VendingContext): VendingView | undefined {
  const { owned, pricing } = context;
  const rules = vendingRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningVending(owned, pricing);
  if (running === undefined) return { status: 'locked', unlockStage: rules.unlockStage };
  const allCents = moneyCents(restockTotalCents(running, 'all'));
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    spots: VENDING_LOCATIONS.map((location) => spotView(running, location, owned.treasuryCents)),
    restockAll: { priceCents: allCents, ...affordability(allCents, owned.treasuryCents) },
    restockers: owned.staff.operations,
    coachMark: context.seenCoachMarks.includes(VENDING_COACH_MARK) ? 'seen' : 'show',
    cardReaders: cardReaderOption(context),
  };
}
