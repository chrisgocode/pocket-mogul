import { joinsPerDay, memberLimit, weatherDraw } from '@/domain/business/carWash';
import {
  carWashRulesOf,
  membershipFeeCents,
  packageRule,
  packageShares,
  runningCarWash,
  type RunningCarWash,
} from '@/domain/business/carWashDemand';
import { quoteDetailing, type DetailingQuote } from '@/domain/business/carWashQuotes';
import { WASH_PACKAGES, type Weather, type WashPackage } from '@/domain/business/carWashRules';
import type { PackageOffer } from '@/domain/business/carWashState';
import { forecastAfter } from '@/domain/business/carWashWeather';
import { businessDayOf, type BusinessPricing, type PriceLevel } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const BASIS_POINTS = 10_000n;
const CAR_WASH_COACH_MARK: CoachMark = 'car_wash';

export type WeatherDay = { readonly weather: Weather; readonly walkInPercent: number };

export type WashPackageView = {
  readonly washPackage: WashPackage;
  readonly priceCents: MoneyCents;
  readonly bayPercent: number;
  readonly sharePercent: number;
  readonly offer: PackageOffer | 'always';
};

export type MembershipView = {
  readonly members: number;
  readonly limit: number;
  readonly joinsPerDay: number;
  readonly feeCents: MoneyCents;
  readonly level: PriceLevel;
  readonly capPercent: number;
  readonly capChoices: readonly number[];
};

export type AvailableDetailing = Extract<DetailingQuote, { status: 'available' }> & Affordability;
export type DetailingOption = Exclude<DetailingQuote, { status: 'available' }> | AvailableDetailing;

export type CarWashView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly today: WeatherDay;
      readonly forecast: readonly WeatherDay[];
      readonly packages: readonly WashPackageView[];
      readonly memberships: MembershipView;
      readonly coachMark: 'show' | 'seen';
      readonly detailing: DetailingOption;
    };

type CarWashContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

const weatherDay = (running: RunningCarWash, weather: Weather): WeatherDay => ({
  weather,
  walkInPercent: running.rules.weatherDemandBps[weather] / BPS_PER_PERCENT,
});

function offerOf(running: RunningCarWash, washPackage: WashPackage): WashPackageView['offer'] {
  if (washPackage === 'basic' || washPackage === 'detailing') return 'always';
  return running.operation.packages[washPackage];
}

function packageViews(running: RunningCarWash, context: CarWashContext): WashPackageView[] {
  const { owned, pricing } = context;
  const shares = packageShares(running);
  const levelBps = BigInt(pricing.rules.priceBps[owned.priceLevel]);
  const levelPrice = (pricing.definition.pricePerCustomerCents * levelBps) / BASIS_POINTS;
  const installed = running.operation.detailing === 'installed';
  return WASH_PACKAGES.filter((washPackage) => washPackage !== 'detailing' || installed).map(
    (washPackage) => {
      const rule = packageRule(running.rules, washPackage);
      return {
        washPackage,
        priceCents: moneyCents((levelPrice * BigInt(rule.priceBps)) / BASIS_POINTS),
        bayPercent: rule.bayBps / BPS_PER_PERCENT,
        sharePercent: shares[washPackage],
        offer: offerOf(running, washPackage),
      };
    },
  );
}

function membershipView(running: RunningCarWash, context: CarWashContext): MembershipView {
  const { owned, pricing } = context;
  const { capStepPercent, maxCapPercent } = running.rules.memberships;
  return {
    members: running.operation.members,
    limit: memberLimit(owned, pricing),
    joinsPerDay: joinsPerDay(owned, pricing),
    feeCents: moneyCents(membershipFeeCents(running, pricing)),
    level: running.operation.membershipLevel,
    capPercent: running.operation.memberCapPercent,
    capChoices: Array.from(
      { length: maxCapPercent / capStepPercent + 1 },
      (_, index) => index * capStepPercent,
    ),
  };
}

function detailingOption(context: CarWashContext): DetailingOption {
  const quote = quoteDetailing(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectCarWash(context: CarWashContext): CarWashView | undefined {
  const { owned, pricing } = context;
  const rules = carWashRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningCarWash(owned, pricing);
  const draw = weatherDraw(owned, context);
  if (running === undefined || draw === undefined) {
    return { status: 'locked', unlockStage: rules.unlockStage };
  }
  const day = businessDayOf(context.simulationMs, pricing.rules);
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    today: weatherDay(running, running.operation.weather),
    forecast: forecastAfter(draw, day).map((weather) => weatherDay(running, weather)),
    packages: packageViews(running, context),
    memberships: membershipView(running, context),
    coachMark: context.seenCoachMarks.includes(CAR_WASH_COACH_MARK) ? 'seen' : 'show',
    detailing: detailingOption(context),
  };
}
