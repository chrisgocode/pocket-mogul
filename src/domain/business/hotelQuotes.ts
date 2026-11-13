import { moneyCents, type MoneyCents } from '@/domain/money';

import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import { hotelRulesOf, runningHotel } from './hotelDemand';
import type { OwnedBusiness } from './owned';

export type ConferenceQuote =
  | { readonly status: 'locked'; readonly unlockStage: number; readonly priceCents: MoneyCents }
  | { readonly status: 'installed' }
  | {
      readonly status: 'available';
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export function quoteConference(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): ConferenceQuote | undefined {
  const rules = hotelRulesOf(pricing);
  if (rules === undefined) return undefined;
  const { conference } = rules;
  const priceCents = moneyCents(pricing.definition.price * BigInt(conference.priceMultiple));
  const running = runningHotel(business, pricing);
  if (running === undefined || business.stage < conference.stage) {
    return { status: 'locked', unlockStage: conference.stage, priceCents };
  }
  if (running.operation.conference === 'installed') return { status: 'installed' };
  const hosting = { ...running.operation, season: 'event' as const };
  const eventSeason = { ...business, hotel: hosting };
  const installed = { ...business, hotel: { ...hosting, conference: 'installed' as const } };
  return {
    status: 'available',
    priceCents,
    profitCents: profitPerDayCents(eventSeason, pricing),
    nextProfitCents: profitPerDayCents(installed, pricing),
  };
}
