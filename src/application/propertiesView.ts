import type { Content, Property } from '@/content';
import type { GameState, OwnedProperty } from '@/domain/gameState';
import type { MoneyCents } from '@/domain/money';
import { findOwnedProperty } from '@/domain/properties';
import { levelZeroProperty, quotePropertyIncome } from '@/domain/propertyQuotes';

import { affordability } from './affordability';
import { selectCashCents, selectRentIncomePerMinuteCents } from './cashView';
import type { GameSnapshot } from './game';

export type PropertyStatus = 'available' | 'vacant' | 'rented';

export type PropertyListing = {
  readonly property: Property;
  readonly status: PropertyStatus;
  readonly rentedNetPerMinuteCents: MoneyCents;
  readonly affordable: boolean;
  readonly shortfallCents: MoneyCents;
};

export type PropertiesView = {
  readonly cashCents: MoneyCents;
  readonly rentPerMinuteCents: MoneyCents;
  readonly ownsAny: boolean;
  readonly listings: readonly PropertyListing[];
};

function listingStatus(owned: OwnedProperty | undefined): PropertyStatus {
  if (owned === undefined) return 'available';
  return owned.rented ? 'rented' : 'vacant';
}

function listing(
  property: Property,
  context: { state: GameState; content: Content; cashCents: MoneyCents },
): PropertyListing {
  const owned = findOwnedProperty(context.state, property.id);
  const income = quotePropertyIncome(
    { ...(owned ?? levelZeroProperty(property.id)), rented: true },
    { definition: property, rules: context.content.economy.propertyRules },
  );
  return {
    property,
    status: listingStatus(owned),
    rentedNetPerMinuteCents: income.netPerMinuteCents,
    ...affordability(property.price, context.cashCents),
  };
}

export function selectProperties(snapshot: GameSnapshot, content: Content): PropertiesView {
  const cashCents = selectCashCents(snapshot, content);
  const { state } = snapshot;
  return {
    cashCents,
    rentPerMinuteCents: selectRentIncomePerMinuteCents(snapshot, content),
    ownsAny: state.properties.length > 0,
    listings: content.properties.map((property) =>
      listing(property, { state, content, cashCents }),
    ),
  };
}
