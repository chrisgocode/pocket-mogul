import type { Content, Property } from '@/content';
import type { OwnedProperty, PropertyLevels } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { findOwnedProperty } from '@/domain/properties';
import {
  estimatedValueCents,
  maxTrackLevel,
  PROPERTY_TRACKS,
  propertySaleProceedsCents,
  quotePropertyIncome,
  quotePropertyUpgrade,
  type PropertyIncomeQuote,
  type PropertyPricing,
  type PropertyTrack,
  type PropertyUpgradeQuote,
} from '@/domain/propertyQuotes';

import { affordability, type Affordability } from './affordability';
import { selectCashCents } from './cashView';
import type { GameSnapshot } from './game';

export type AvailablePropertyUpgrade = Extract<PropertyUpgradeQuote, { status: 'available' }> &
  Affordability & { readonly rented: boolean; readonly rentedBenefitPerMinuteCents: MoneyCents };

export type PropertyUpgradeOption = (
  | Exclude<PropertyUpgradeQuote, { status: 'available' }>
  | AvailablePropertyUpgrade
) & { readonly maxLevel: number };

export type PropertySale = {
  readonly proceedsCents: MoneyCents;
  readonly valueCents: MoneyCents;
  readonly salePercent: number;
};

export type OwnedPropertyDetail = {
  readonly status: 'owned';
  readonly property: Property;
  readonly rented: boolean;
  readonly levels: PropertyLevels;
  readonly income: PropertyIncomeQuote;
  readonly rentedNetPerMinuteCents: MoneyCents;
  readonly valueCents: MoneyCents;
  readonly valueUpgradePercent: number;
  readonly upgrades: readonly PropertyUpgradeOption[];
  readonly sale: PropertySale;
};

export type PropertyDetailView =
  | { readonly status: 'unknown' }
  | { readonly status: 'not_owned'; readonly property: Property }
  | OwnedPropertyDetail;

type DetailContext = { owned: OwnedProperty; pricing: PropertyPricing; cashCents: MoneyCents };

function upgradeOption(track: PropertyTrack, context: DetailContext): PropertyUpgradeOption {
  const { owned, pricing } = context;
  const maxLevel = maxTrackLevel(track, pricing);
  const quote = quotePropertyUpgrade(owned, { ...pricing, track });
  if (quote.status !== 'available') return { ...quote, maxLevel };
  const before = quote.rentCents - quote.upkeepCents;
  const after = quote.nextRentCents - quote.nextUpkeepCents;
  return {
    ...quote,
    maxLevel,
    rented: owned.rented,
    rentedBenefitPerMinuteCents: moneyCents(after - before),
    ...affordability(quote.priceCents, context.cashCents),
  };
}

function ownedDetail(property: Property, context: DetailContext): OwnedPropertyDetail {
  const { owned, pricing } = context;
  const valueCents = estimatedValueCents(owned, pricing);
  return {
    status: 'owned',
    property,
    rented: owned.rented,
    levels: owned.levels,
    income: quotePropertyIncome(owned, pricing),
    rentedNetPerMinuteCents: quotePropertyIncome({ ...owned, rented: true }, pricing)
      .netPerMinuteCents,
    valueCents,
    valueUpgradePercent: pricing.rules.valueUpgradePercent,
    upgrades: PROPERTY_TRACKS.map((track) => upgradeOption(track, context)),
    sale: {
      proceedsCents: propertySaleProceedsCents(owned, pricing),
      valueCents,
      salePercent: pricing.rules.saleValuePercent,
    },
  };
}

export function selectPropertyDetail(
  snapshot: GameSnapshot,
  request: { propertyId: string; content: Content },
): PropertyDetailView {
  const { content } = request;
  const property = content.properties.find((each) => each.id === request.propertyId);
  if (property === undefined) return { status: 'unknown' };
  const owned = findOwnedProperty(snapshot.state, property.id);
  if (owned === undefined) return { status: 'not_owned', property };
  return ownedDetail(property, {
    owned,
    pricing: { definition: property, rules: content.economy.propertyRules },
    cashCents: selectCashCents(snapshot, content),
  });
}
