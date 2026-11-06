import { TIERS, type Business, type Content, type Tier } from '@/content';
import { quoteBusinessIncome, levelZeroBusiness } from '@/domain/businessQuotes';
import { findOwnedBusiness } from '@/domain/businesses';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability } from './affordability';
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

export type NextTierUnlock = {
  readonly tier: Tier;
  readonly atCents: MoneyCents;
  readonly remainingCents: MoneyCents;
};

export type BusinessesView = {
  readonly cashCents: MoneyCents;
  readonly incomePerMinuteCents: MoneyCents;
  readonly peakNetWorthCents: MoneyCents;
  readonly nextUnlock: NextTierUnlock | undefined;
  readonly owned: readonly BusinessOffer[];
  readonly tiers: readonly TierView[];
};

type OfferContext = {
  snapshot: GameSnapshot;
  content: Content;
  cashCents: MoneyCents;
  unlocked: boolean;
};

function offer(business: Business, context: OfferContext): BusinessOffer {
  const owned = findOwnedBusiness(context.snapshot.state, business.id);
  const income = quoteBusinessIncome(owned ?? levelZeroBusiness(business.id), {
    definition: business,
    rules: context.content.economy.businessRules,
  });
  const available = context.unlocked ? 'available' : 'locked';
  return {
    business,
    netPerMinuteCents: income.netPerMinuteCents,
    status: owned === undefined ? available : 'owned',
    ...affordability(business.price, context.cashCents),
  };
}

function unlockAt(tier: Tier, content: Content): MoneyCents | undefined {
  return tier === 1 ? undefined : content.economy.tierUnlocks[tier];
}

function nextUnlock(tiers: readonly TierView[], peakCents: MoneyCents): NextTierUnlock | undefined {
  const next = tiers.find((tier) => !tier.unlocked && tier.unlockAtCents !== undefined);
  if (next?.unlockAtCents === undefined) return undefined;
  const remaining = next.unlockAtCents - peakCents;
  return {
    tier: next.tier,
    atCents: next.unlockAtCents,
    remainingCents: moneyCents(remaining > 0n ? remaining : 0n),
  };
}

export function selectBusinesses(snapshot: GameSnapshot, content: Content): BusinessesView {
  const cashCents = selectCashCents(snapshot, content);
  const tiers = TIERS.map((tier) => {
    const unlocked = snapshot.state.unlockedTiers.includes(tier);
    const offers = content.businesses
      .filter((business) => business.tier === tier)
      .map((business) => offer(business, { snapshot, content, cashCents, unlocked }));
    return { tier, unlocked, unlockAtCents: unlockAt(tier, content), offers };
  });
  const { peakNetWorthCents } = snapshot.state;
  return {
    cashCents,
    incomePerMinuteCents: selectIncomePerMinuteCents(snapshot, content),
    peakNetWorthCents,
    nextUnlock: nextUnlock(tiers, peakNetWorthCents),
    owned: tiers.flatMap((tier) => tier.offers).filter((each) => each.status === 'owned'),
    tiers,
  };
}
