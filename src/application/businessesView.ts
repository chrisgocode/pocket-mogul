import { TIERS, type Business, type Content, type Tier } from '@/content';
import { findOwnedBusiness } from '@/domain/business/commands';
import { profitPerDayCents } from '@/domain/business/core';
import { findBusiness } from '@/domain/business/definition';
import { newBusiness } from '@/domain/business/owned';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability } from './affordability';
import { selectCashCents, selectBusinessIncomePerMinuteCents } from './cashView';
import { businessEconomy } from './economy';
import type { GameSnapshot } from './game';

export type BusinessOffer = {
  readonly business: Business;
  readonly profitPerDayCents: MoneyCents;
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

function profitOf(business: Business, context: OfferContext): MoneyCents {
  const { catalog, rules } = businessEconomy(context.content);
  const definition = findBusiness(catalog, business.id);
  if (definition === undefined) return moneyCents(0);
  const owned = findOwnedBusiness(context.snapshot.state, business.id);
  const running = owned ?? newBusiness(definition, { rules, atMs: 0 });
  return profitPerDayCents(running, { definition, rules });
}

function offer(business: Business, context: OfferContext): BusinessOffer {
  const owned = findOwnedBusiness(context.snapshot.state, business.id);
  const available = context.unlocked ? 'available' : 'locked';
  return {
    business,
    profitPerDayCents: profitOf(business, context),
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
    incomePerMinuteCents: selectBusinessIncomePerMinuteCents(snapshot, content),
    peakNetWorthCents,
    nextUnlock: nextUnlock(tiers, peakNetWorthCents),
    owned: tiers.flatMap((tier) => tier.offers).filter((each) => each.status === 'owned'),
    tiers,
  };
}
