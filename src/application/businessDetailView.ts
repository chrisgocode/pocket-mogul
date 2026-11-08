import type { Business, Content } from '@/content';
import {
  bestPriceLevel,
  carryingValueCents,
  cashPerMinuteCents,
  profitPerDayCents,
  quoteBusinessDay,
  quoteImprovement,
  quoteUnit,
  saleProceedsCents,
  type BusinessDayQuote,
  type ImprovementQuote,
  type UnitQuote,
} from '@/domain/business/core';
import { findOwnedBusiness } from '@/domain/business/commands';
import {
  BUSINESS_TRACKS,
  findBusiness,
  PRICE_LEVELS,
  STAFF_ROLES,
  type BusinessPricing,
  type BusinessTrack,
  type PriceLevel,
  type StaffRole,
} from '@/domain/business/definition';
import { quoteStaff, type StaffQuote } from '@/domain/business/staff';
import { daysOwned, quoteStage, type StageQuote } from '@/domain/business/stages';
import type { BusinessStatus, OwnedBusiness } from '@/domain/business/owned';
import type { MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';
import { selectBusinessRisks, type BusinessRisks } from './businessRisksView';
import { selectCashCents, stateWithUnsavedIncome } from './cashView';
import { businessEconomy } from './economy';
import type { GameSnapshot } from './game';
import { selectVending, type VendingView } from './vendingView';

export type AvailableUnit = Extract<UnitQuote, { status: 'available' }> & Affordability;
export type UnitOption = Extract<UnitQuote, { status: 'at_cap' }> | AvailableUnit;

export type AvailableImprovement = Extract<ImprovementQuote, { status: 'available' }> &
  Affordability;
export type ImprovementOption = Extract<ImprovementQuote, { status: 'max' }> | AvailableImprovement;

export type AvailableHire = Extract<StaffQuote, { status: 'available' }> & Affordability;
export type StaffOption = Exclude<StaffQuote, { status: 'available' }> | AvailableHire;

export type ReadyStage = Extract<StageQuote, { status: 'ready' }> & Affordability;
export type StageOption = Exclude<StageQuote, { status: 'ready' }> | ReadyStage;

export type PriceLevelOption = {
  readonly priceLevel: PriceLevel;
  readonly profitCents: MoneyCents;
  readonly best: boolean;
};

export type BusinessSale = {
  readonly proceedsCents: MoneyCents;
  readonly spendCents: MoneyCents;
  readonly treasuryCents: MoneyCents;
  readonly carryingValueCents: MoneyCents;
};

export type OwnedBusinessDetail = {
  readonly status: 'owned';
  readonly business: Business;
  readonly operation: BusinessStatus;
  readonly stage: number;
  readonly units: number;
  readonly daysOwned: number;
  readonly day: BusinessDayQuote;
  readonly cashPerMinuteCents: MoneyCents;
  readonly priceLevel: PriceLevel;
  readonly priceLevels: readonly PriceLevelOption[];
  readonly payoutPercent: number;
  readonly payoutStepPercent: number;
  readonly treasuryCents: MoneyCents;
  readonly cashCents: MoneyCents;
  readonly maxTrackLevel: number;
  readonly saleReturnPercent: number;
  readonly unit: UnitOption;
  readonly improvements: readonly ImprovementOption[];
  readonly staff: readonly StaffOption[];
  readonly managerHired: boolean;
  readonly stageUpgrade: StageOption;
  readonly risks: BusinessRisks;
  readonly vending: VendingView | undefined;
  readonly sale: BusinessSale;
};

export type BusinessDetailView =
  | { readonly status: 'unknown' }
  | { readonly status: 'not_owned'; readonly business: Business }
  | OwnedBusinessDetail;

type DetailContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly simulationMs: number;
  readonly cashCents: MoneyCents;
  readonly seenCoachMarks: readonly string[];
};

function unitOption({ owned, pricing }: DetailContext): UnitOption {
  const quote = quoteUnit(owned, pricing);
  if (quote.status === 'at_cap') return quote;
  return { ...quote, ...affordability(quote.priceCents, owned.treasuryCents) };
}

function improvementOption(track: BusinessTrack, context: DetailContext): ImprovementOption {
  const quote = quoteImprovement(context.owned, { ...context.pricing, track });
  if (quote.status === 'max') return quote;
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

function staffOption(role: StaffRole, context: DetailContext): StaffOption {
  const quote = quoteStaff(context.owned, { ...context.pricing, role });
  if (quote.status !== 'available') return quote;
  return { ...quote, ...affordability(quote.signingFeeCents, context.owned.treasuryCents) };
}

function stageOption({ owned, pricing, simulationMs }: DetailContext): StageOption {
  const quote = quoteStage(owned, { pricing, atMs: simulationMs });
  if (quote.status !== 'ready') return quote;
  return { ...quote, ...affordability(quote.priceCents, owned.treasuryCents) };
}

function priceLevelOptions({ owned, pricing }: DetailContext): PriceLevelOption[] {
  const best = bestPriceLevel(owned, pricing);
  return PRICE_LEVELS.map((priceLevel) => ({
    priceLevel,
    profitCents: profitPerDayCents({ ...owned, priceLevel }, pricing),
    best: priceLevel === best,
  }));
}

function ownedDetail(business: Business, context: DetailContext): OwnedBusinessDetail {
  const { owned, pricing } = context;
  const { rules } = pricing;
  return {
    status: 'owned',
    business,
    operation: owned.status,
    stage: owned.stage,
    units: owned.units,
    daysOwned: daysOwned(owned, { pricing, atMs: context.simulationMs }),
    day: quoteBusinessDay(owned, pricing),
    cashPerMinuteCents: cashPerMinuteCents(owned, pricing),
    priceLevel: owned.priceLevel,
    priceLevels: priceLevelOptions(context),
    payoutPercent: owned.payoutPercent,
    payoutStepPercent: rules.payoutStepPercent,
    treasuryCents: owned.treasuryCents,
    cashCents: context.cashCents,
    maxTrackLevel: rules.maxTrackLevel,
    saleReturnPercent: rules.saleReturnPercent,
    unit: unitOption(context),
    improvements: BUSINESS_TRACKS.map((track) => improvementOption(track, context)),
    staff: STAFF_ROLES.map((role) => staffOption(role, context)),
    managerHired: owned.staff.manager > 0,
    stageUpgrade: stageOption(context),
    risks: selectBusinessRisks({ ...context, business }),
    vending: selectVending(context),
    sale: {
      proceedsCents: saleProceedsCents(owned, rules),
      spendCents: owned.capitalizedSpendCents,
      treasuryCents: owned.treasuryCents,
      carryingValueCents: carryingValueCents(owned),
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
  const state = stateWithUnsavedIncome(snapshot, content);
  const owned = findOwnedBusiness(state, business.id);
  const economy = businessEconomy(content);
  const definition = findBusiness(economy.catalog, business.id);
  if (owned === undefined || definition === undefined) return { status: 'not_owned', business };
  return ownedDetail(business, {
    owned,
    pricing: { definition, rules: economy.rules },
    simulationMs: state.clock.simulationMs,
    cashCents: selectCashCents(snapshot, content),
    seenCoachMarks: state.seenCoachMarks,
  });
}
