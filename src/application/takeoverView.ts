import type { Business, Rival } from '@/content';
import { profitPerDayCents } from '@/domain/business/core';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import {
  acceptanceChanceBps,
  lockOn,
  mergedWith,
  rivalStanding,
} from '@/domain/business/takeovers';
import { rivalValuationCents, valuationCents } from '@/domain/business/valuation';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const PERCENT = 100n;

export type TakeoverOffer = Affordability & {
  readonly percent: number;
  readonly priceCents: MoneyCents;
  readonly chanceBps: number;
  readonly profitCents: MoneyCents;
  readonly nextProfitCents: MoneyCents;
  readonly unitsAfter: number;
  readonly qualityAfter: number;
};

type Valued = Rival & { readonly valuationCents: MoneyCents };

export type RivalView =
  | ({ readonly status: 'merged' } & Rival)
  | ({ readonly status: 'waiting' } & Valued)
  | ({ readonly status: 'locked'; readonly daysLeft: number } & Valued)
  | ({
      readonly status: 'pending';
      readonly amountCents: MoneyCents;
      readonly chanceBps: number;
    } & Valued)
  | ({ readonly status: 'open'; readonly offers: readonly TakeoverOffer[] } & Valued);

export type OpenRival = Extract<RivalView, { status: 'open' }>;

export type DealsView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'open';
      readonly valuationCents: MoneyCents;
      readonly offerPercents: readonly number[];
      readonly rivals: readonly RivalView[];
    };

type DealsContext = {
  readonly business: Business;
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly simulationMs: number;
};

type RivalContext = DealsContext & { readonly day: number; readonly rival: Rival };

function offerAt(
  percent: number,
  context: RivalContext & { valuation: MoneyCents },
): TakeoverOffer {
  const { owned, pricing, valuation } = context;
  const priceCents = moneyCents((valuation * BigInt(percent)) / PERCENT);
  const merged = mergedWith(owned, { rival: context.rival, amountCents: priceCents, pricing });
  return {
    percent,
    priceCents,
    chanceBps: acceptanceChanceBps(
      { amountCents: priceCents, valuationCents: valuation },
      pricing.rules.takeovers,
    ),
    profitCents: profitPerDayCents(owned, pricing),
    nextProfitCents: profitPerDayCents(merged, pricing),
    unitsAfter: merged.units,
    qualityAfter: merged.levels.quality,
    ...affordability(priceCents, owned.treasuryCents),
  };
}

function pendingView(valued: Valued, context: RivalContext): RivalView {
  const { offer } = context.owned.takeovers;
  const amountCents = offer.status === 'pending' ? offer.amountCents : moneyCents(0);
  const chanceBps = acceptanceChanceBps(
    { amountCents, valuationCents: valued.valuationCents },
    context.pricing.rules.takeovers,
  );
  return { status: 'pending', ...valued, amountCents, chanceBps };
}

function rivalView(context: RivalContext): RivalView {
  const { owned, pricing, day, rival } = context;
  const standing = rivalStanding(owned, { pricing, rivalId: rival.id, day });
  if (standing === 'merged' || standing === 'unknown') return { status: 'merged', ...rival };
  const valuation = rivalValuationCents(rival, pricing);
  const valued = { ...rival, valuationCents: valuation };
  if (standing === 'pending') return pendingView(valued, context);
  const lock = lockOn(owned, { rivalId: rival.id, day });
  if (lock !== undefined) return { status: 'locked', ...valued, daysLeft: lock.untilDay - day };
  if (standing === 'waiting') return { status: 'waiting', ...valued };
  const offers = pricing.rules.takeovers.offerPercents.map((percent) =>
    offerAt(percent, { ...context, valuation }),
  );
  return { status: 'open', ...valued, offers };
}

export function selectDeals(context: DealsContext): DealsView {
  const { owned, pricing, business } = context;
  const rules = pricing.rules.takeovers;
  if (owned.stage < rules.fromStage) return { status: 'locked', unlockStage: rules.fromStage };
  const day = businessDayOf(context.simulationMs, pricing.rules);
  return {
    status: 'open',
    valuationCents: valuationCents(owned, pricing),
    offerPercents: rules.offerPercents,
    rivals: business.rivals.map((rival) => rivalView({ ...context, day, rival })),
  };
}
