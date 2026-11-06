import type { Business, Content } from '@/content';
import {
  branchCount,
  managerPriceCents,
  quoteBusinessIncome,
  quoteBusinessUpgrade,
  saleProceedsCents,
  UPGRADE_TRACKS,
  type BusinessIncomeQuote,
  type BusinessPricing,
  type BusinessUpgradeQuote,
} from '@/domain/businessQuotes';
import { findOwnedBusiness } from '@/domain/businesses';
import type { BusinessLevels, OwnedBusiness } from '@/domain/gameState';
import type { MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';
import { selectCashCents } from './cashView';
import type { GameSnapshot } from './game';

export type AvailableBusinessUpgrade = Extract<BusinessUpgradeQuote, { status: 'available' }> &
  Affordability;

export type BusinessUpgradeOption =
  | Extract<BusinessUpgradeQuote, { status: 'max' }>
  | AvailableBusinessUpgrade;

export type AvailableManager = Affordability & {
  readonly status: 'available';
  readonly priceCents: MoneyCents;
  readonly netPerMinuteCents: MoneyCents;
  readonly nextNetPerMinuteCents: MoneyCents;
};

export type ManagerOption = { readonly status: 'hired' } | AvailableManager;

export type BusinessSale = {
  readonly proceedsCents: MoneyCents;
  readonly carryingValueCents: MoneyCents;
};

export type OwnedBusinessDetail = {
  readonly status: 'owned';
  readonly business: Business;
  readonly levels: BusinessLevels;
  readonly maxTrackLevel: number;
  readonly milestoneEveryLevels: number;
  readonly managerBonusBps: number;
  readonly saleReturnPercent: number;
  readonly branches: number;
  readonly income: BusinessIncomeQuote;
  readonly upgrades: readonly BusinessUpgradeOption[];
  readonly manager: ManagerOption;
  readonly sale: BusinessSale;
};

export type BusinessDetailView =
  | { readonly status: 'unknown' }
  | { readonly status: 'not_owned'; readonly business: Business }
  | OwnedBusinessDetail;

type DetailContext = { owned: OwnedBusiness; pricing: BusinessPricing; cashCents: MoneyCents };

function upgradeOption(track: (typeof UPGRADE_TRACKS)[number], context: DetailContext) {
  const quote = quoteBusinessUpgrade(context.owned, { ...context.pricing, track });
  if (quote.status === 'max') return quote;
  return { ...quote, ...affordability(quote.priceCents, context.cashCents) };
}

function managerOption(context: DetailContext, income: BusinessIncomeQuote): ManagerOption {
  if (context.owned.managerOwned) return { status: 'hired' };
  const priceCents = managerPriceCents(context.pricing);
  const hired = quoteBusinessIncome({ ...context.owned, managerOwned: true }, context.pricing);
  return {
    status: 'available',
    priceCents,
    netPerMinuteCents: income.netPerMinuteCents,
    nextNetPerMinuteCents: hired.netPerMinuteCents,
    ...affordability(priceCents, context.cashCents),
  };
}

function ownedDetail(business: Business, context: DetailContext): OwnedBusinessDetail {
  const { owned, pricing } = context;
  const income = quoteBusinessIncome(owned, pricing);
  return {
    status: 'owned',
    business,
    levels: owned.levels,
    maxTrackLevel: pricing.rules.maxTrackLevel,
    milestoneEveryLevels: pricing.rules.milestoneEveryLevels,
    managerBonusBps: pricing.rules.managerBonusBps,
    saleReturnPercent: pricing.rules.saleReturnPercent,
    branches: branchCount(owned.levels.capacity, pricing.rules),
    income,
    upgrades: UPGRADE_TRACKS.map((track) => upgradeOption(track, context)),
    manager: managerOption(context, income),
    sale: {
      proceedsCents: saleProceedsCents(owned, pricing.rules),
      carryingValueCents: owned.capitalizedSpendCents,
    },
  };
}

export function selectBusinessDetail(
  snapshot: GameSnapshot,
  request: { businessId: string; content: Content },
): BusinessDetailView {
  const { content } = request;
  const business = content.businesses.find((each) => each.id === request.businessId);
  if (business === undefined) return { status: 'unknown' };
  const owned = findOwnedBusiness(snapshot.state, business.id);
  if (owned === undefined) return { status: 'not_owned', business };
  return ownedDetail(business, {
    owned,
    pricing: { definition: business, rules: content.economy.businessRules },
    cashCents: selectCashCents(snapshot, content),
  });
}
