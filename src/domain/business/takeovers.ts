import { drawInt, type InclusiveRange } from '@/domain/marketRandom';
import { moneyCents, type MoneyCents } from '@/domain/money';

import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import type { DayStart } from './risks';
import {
  NO_OFFER,
  type Rival,
  type TakeoverLock,
  type TakeoverRules,
  type Takeovers,
} from './takeoverState';
import { rivalValuationCents } from './valuation';
import { withVendingUnlocked } from './vending';

export type RivalStanding = 'unknown' | 'merged' | 'pending' | 'locked' | 'waiting' | 'open';

const BASIS_POINTS = 10_000;
const BPS_PER_PERCENT = 100n;
const TAKEOVER_STREAM = 'takeover';
const ROLL: InclusiveRange = [0, BASIS_POINTS - 1];

function findRival(pricing: BusinessPricing, rivalId: string): Rival | undefined {
  return pricing.definition.rivals.find((rival) => rival.id === rivalId);
}

export function lockOn(
  business: OwnedBusiness,
  look: { readonly rivalId: string; readonly day: number },
): TakeoverLock | undefined {
  return business.takeovers.locks.find(
    (lock) => lock.rivalId === look.rivalId && lock.untilDay > look.day,
  );
}

export function rivalStanding(
  business: OwnedBusiness,
  look: { readonly pricing: BusinessPricing; readonly rivalId: string; readonly day: number },
): RivalStanding {
  const { offer, merged } = business.takeovers;
  if (findRival(look.pricing, look.rivalId) === undefined) return 'unknown';
  if (merged.includes(look.rivalId)) return 'merged';
  if (offer.status === 'pending' && offer.rivalId === look.rivalId) return 'pending';
  if (lockOn(business, look) !== undefined) return 'locked';
  return offer.status === 'pending' ? 'waiting' : 'open';
}

export function acceptanceChanceBps(
  offer: { readonly amountCents: MoneyCents; readonly valuationCents: MoneyCents },
  rules: TakeoverRules,
): number {
  if (offer.valuationCents <= 0n) return BASIS_POINTS;
  const offeredBps = (offer.amountCents * BigInt(BASIS_POINTS)) / offer.valuationCents;
  const fromBps = BigInt(rules.acceptFromPercent) * BPS_PER_PERCENT;
  const spanBps = BigInt(rules.acceptAllPercent - rules.acceptFromPercent) * BPS_PER_PERCENT;
  const chance = Number(((offeredBps - fromBps) * BigInt(BASIS_POINTS)) / spanBps);
  return Math.min(BASIS_POINTS, Math.max(0, chance));
}

export function mergedWith(
  business: OwnedBusiness,
  merger: { readonly rival: Rival; readonly amountCents: MoneyCents; pricing: BusinessPricing },
): OwnedBusiness {
  const { rival, amountCents } = merger;
  const { takeovers, levels } = business;
  const joined: OwnedBusiness = {
    ...business,
    units: business.units + rival.units,
    levels: { ...levels, quality: Math.max(levels.quality, rival.quality) },
    treasuryCents: moneyCents(business.treasuryCents - amountCents),
    capitalizedSpendCents: moneyCents(business.capitalizedSpendCents + amountCents),
    takeovers: { ...takeovers, offer: NO_OFFER, merged: [...takeovers.merged, rival.id] },
  };
  return withVendingUnlocked(joined, merger.pricing);
}

function withTakeovers(business: OwnedBusiness, takeovers: Takeovers): OwnedBusiness {
  return { ...business, takeovers };
}

function accepts(
  business: OwnedBusiness,
  answer: DayStart & { readonly rival: Rival; readonly amountCents: MoneyCents },
): boolean {
  const { pricing } = answer;
  const valuation = rivalValuationCents(answer.rival, pricing);
  const chanceBps = acceptanceChanceBps(
    { amountCents: answer.amountCents, valuationCents: valuation },
    pricing.rules.takeovers,
  );
  const draw = { seed: answer.seed, tick: answer.day, scope: business.definitionId };
  return drawInt({ ...draw, stream: TAKEOVER_STREAM }, ROLL) < chanceBps;
}

export function answerTakeover(business: OwnedBusiness, start: DayStart): OwnedBusiness {
  const { takeovers } = business;
  const locks = takeovers.locks.filter((lock) => lock.untilDay > start.day);
  const { offer } = takeovers;
  if (offer.status === 'none') return withTakeovers(business, { ...takeovers, locks });
  const cleared = withTakeovers(business, { ...takeovers, locks, offer: NO_OFFER });
  const rival = findRival(start.pricing, offer.rivalId);
  const payable = business.status === 'open' && business.treasuryCents >= offer.amountCents;
  if (rival === undefined || !payable) return cleared;
  const { amountCents } = offer;
  if (accepts(business, { ...start, rival, amountCents })) {
    return mergedWith(cleared, { rival, amountCents, pricing: start.pricing });
  }
  const lock = { rivalId: rival.id, untilDay: start.day + start.pricing.rules.takeovers.lockDays };
  return withTakeovers(cleared, { ...cleared.takeovers, locks: [...locks, lock] });
}
