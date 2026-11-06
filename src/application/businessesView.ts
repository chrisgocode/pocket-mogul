import { TIERS, type Business, type Content, type Tier } from '@/content';
import { businessNetPerMinuteCents, ownsBusiness } from '@/domain/businesses';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { selectCashCents, selectIncomePerMinuteCents } from './cashView';
import type { GameSnapshot } from './game';

export type BusinessOffer = {
  readonly business: Business;
  readonly netPerMinuteCents: MoneyCents;
  readonly status: 'owned' | 'locked' | 'available';
  readonly affordable: boolean;
  readonly shortfallCents: MoneyCents;
};

export type TierView = {
  readonly tier: Tier;
  readonly unlocked: boolean;
  readonly unlockAtCents: MoneyCents | undefined;
  readonly offers: readonly BusinessOffer[];
};

export type BusinessesView = {
  readonly cashCents: MoneyCents;
  readonly incomePerMinuteCents: MoneyCents;
  readonly owned: readonly BusinessOffer[];
  readonly tiers: readonly TierView[];
};

type OfferContext = { snapshot: GameSnapshot; cashCents: MoneyCents; unlocked: boolean };

function offerStatus(business: Business, context: OfferContext): BusinessOffer['status'] {
  if (ownsBusiness(context.snapshot.state, business.id)) return 'owned';
  return context.unlocked ? 'available' : 'locked';
}

function offer(business: Business, context: OfferContext): BusinessOffer {
  const shortfall = business.price - context.cashCents;
  return {
    business,
    netPerMinuteCents: businessNetPerMinuteCents(business),
    status: offerStatus(business, context),
    affordable: shortfall <= 0n,
    shortfallCents: moneyCents(shortfall > 0n ? shortfall : 0n),
  };
}

function unlockAt(tier: Tier, content: Content): MoneyCents | undefined {
  return tier === 1 ? undefined : content.economy.tierUnlocks[tier];
}

export function selectBusinesses(snapshot: GameSnapshot, content: Content): BusinessesView {
  const cashCents = selectCashCents(snapshot, content);
  const tiers = TIERS.map((tier) => {
    const unlocked = snapshot.state.unlockedTiers.includes(tier);
    const offers = content.businesses
      .filter((business) => business.tier === tier)
      .map((business) => offer(business, { snapshot, cashCents, unlocked }));
    return { tier, unlocked, unlockAtCents: unlockAt(tier, content), offers };
  });
  return {
    cashCents,
    incomePerMinuteCents: selectIncomePerMinuteCents(snapshot, content),
    owned: tiers.flatMap((tier) => tier.offers).filter((each) => each.status === 'owned'),
    tiers,
  };
}
