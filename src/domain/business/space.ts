import { moneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { runningSpace, spaceRulesOf, type RunningSpace } from './spaceDemand';
import {
  CADENCES,
  NO_PAYLOAD_OFFER_ANSWERED,
  type ActiveSpace,
  type Cadence,
  type PayloadContract,
  type PayloadOffer,
} from './spaceRules';
import { launchWeatherOn, payloadOfferOn, type SpaceDraw } from './spaceWeather';

const PERCENT = 100;
const BASIS_POINTS = 10_000n;

export type SpaceDayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

export function spaceDraw(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly seed: string },
): SpaceDraw | undefined {
  const rules = spaceRulesOf(start.pricing);
  if (rules === undefined) return undefined;
  return { seed: start.seed, businessId: business.definitionId, rules };
}

export function withSpaceUnlocked(business: OwnedBusiness, start: SpaceDayStart): OwnedBusiness {
  const draw = spaceDraw(business, start);
  if (draw === undefined || business.space.status === 'active') return business;
  if (business.stage < draw.rules.unlockStage) return business;
  const space: ActiveSpace = {
    status: 'active',
    cadence: draw.rules.defaultCadence,
    weather: launchWeatherOn(draw, start.day),
    contracts: [],
    answeredOffer: NO_PAYLOAD_OFFER_ANSWERED,
    boosters: 'none',
  };
  return { ...business, space };
}

export function openPayloadOffer(
  running: RunningSpace,
  board: { readonly draw: SpaceDraw; readonly day: number },
): PayloadOffer | undefined {
  const offer = payloadOfferOn(board.draw, board.day);
  const full = running.operation.contracts.length >= running.rules.payloads.maxContracts;
  return full || offer.id <= running.operation.answeredOffer ? undefined : offer;
}

export function payloadContractFrom(
  offer: PayloadOffer,
  taking: {
    readonly business: OwnedBusiness;
    readonly pricing: BusinessPricing;
    readonly penaltyBps: number;
    readonly day: number;
  },
): PayloadContract {
  const { definition } = taking.pricing;
  const basePayloads = definition.capacityPerUnit * taking.business.units;
  const priced = (bps: number) =>
    moneyCents((definition.pricePerCustomerCents * BigInt(bps)) / BASIS_POINTS);
  return {
    clientId: offer.clientId,
    parcelsPerDay: Math.floor((basePayloads * offer.sizePercent) / PERCENT),
    rateCents: priced(offer.rateBps),
    penaltyCents: priced(taking.penaltyBps),
    endsDay: taking.day + offer.days,
  };
}

export function bestCadence(business: OwnedBusiness, pricing: BusinessPricing): Cadence {
  const running = runningSpace(business, pricing);
  if (running === undefined) return CADENCES[0];
  const { operation } = running;
  const flown = (cadence: Cadence) => ({
    cadence,
    profit: profitPerDayCents({ ...business, space: { ...operation, cadence } }, pricing),
  });
  return CADENCES.filter((cadence) => cadence !== operation.cadence)
    .map(flown)
    .reduce((best, each) => (each.profit > best.profit ? each : best), flown(operation.cadence))
    .cadence;
}

export function startSpaceDay(business: OwnedBusiness, start: SpaceDayStart): OwnedBusiness {
  const unlocked = withSpaceUnlocked(business, start);
  const running = runningSpace(unlocked, start.pricing);
  const draw = spaceDraw(unlocked, start);
  if (running === undefined || draw === undefined) return unlocked;
  const contracts = running.operation.contracts.filter((each) => each.endsDay > start.day);
  const space = { ...running.operation, contracts, weather: launchWeatherOn(draw, start.day) };
  const ready = { ...unlocked, space };
  const managed = unlocked.staff.manager > 0 && unlocked.status === 'open';
  if (!managed) return ready;
  return { ...ready, space: { ...space, cadence: bestCadence(ready, start.pricing) } };
}
