import type { Content } from '@/content';
import { saleProceedsCents } from '@/domain/businessQuotes';
import type { GameState } from '@/domain/gameState';
import { quoteOf } from '@/domain/market';
import type { MoneyCents, QuantityMicrounits } from '@/domain/money';
import { estimatedValueCents, propertySaleProceedsCents } from '@/domain/propertyQuotes';
import { markPosition } from '@/domain/tradeQuotes';
import { findInstrument } from '@/domain/trades';

import { tradeEconomy } from './economy';

export type OwnedHolding = {
  readonly id: string;
  readonly name: string;
  readonly valueCents: MoneyCents;
  readonly saleCents: MoneyCents;
};

export type PropertyHolding = OwnedHolding & { readonly rented: boolean };

export type MarketHolding = {
  readonly id: string;
  readonly name: string;
  readonly ticker: string;
  readonly quantity: QuantityMicrounits;
  readonly valueCents: MoneyCents;
  readonly unrealizedCents: MoneyCents;
  readonly realizedCents: MoneyCents;
};

export type Holdings = {
  readonly businesses: readonly OwnedHolding[];
  readonly properties: readonly PropertyHolding[];
  readonly positions: readonly MarketHolding[];
};

function businessHoldings(state: GameState, content: Content): OwnedHolding[] {
  return state.businesses.flatMap((owned) => {
    const definition = content.businesses.find((listed) => listed.id === owned.definitionId);
    if (definition === undefined) return [];
    return [
      {
        id: owned.definitionId,
        name: definition.name,
        valueCents: owned.capitalizedSpendCents,
        saleCents: saleProceedsCents(owned, content.economy.businessRules),
      },
    ];
  });
}

function propertyHoldings(state: GameState, content: Content): PropertyHolding[] {
  return state.properties.flatMap((owned) => {
    const definition = content.properties.find((listed) => listed.id === owned.definitionId);
    if (definition === undefined) return [];
    const pricing = { definition, rules: content.economy.propertyRules };
    return [
      {
        id: owned.definitionId,
        name: definition.name,
        valueCents: estimatedValueCents(owned, pricing),
        saleCents: propertySaleProceedsCents(owned, pricing),
        rented: owned.rented,
      },
    ];
  });
}

function listing(content: Content, assetId: string) {
  return [...content.stocks, ...content.coins].find((listed) => listed.id === assetId);
}

function marketHoldings(state: GameState, content: Content): MarketHolding[] {
  const economy = tradeEconomy(content);
  return state.positions.flatMap((position) => {
    const instrument = findInstrument(economy, position.instrumentId);
    const listed = listing(content, position.instrumentId);
    if (instrument === undefined || listed === undefined) return [];
    const mark = markPosition(position, quoteOf(state.market, instrument));
    return [
      {
        id: listed.id,
        name: listed.name,
        ticker: listed.ticker,
        quantity: position.quantity,
        valueCents: mark.valueCents,
        unrealizedCents: mark.unrealizedCents,
        realizedCents: position.realizedProfitCents,
      },
    ];
  });
}

export function selectHoldings(state: GameState, content: Content): Holdings {
  return {
    businesses: businessHoldings(state, content),
    properties: propertyHoldings(state, content),
    positions: marketHoldings(state, content),
  };
}
