import { businessTaxSource, instrumentTaxBasis, propertyTaxBasis } from '@/domain/tax/sources';
import type { Content } from '@/content';
import { findBusiness } from '@/domain/business/definition';
import { saleProceedsCents } from '@/domain/business/core';
import { listedSaleCents } from '@/domain/business/listings';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';
import { netWorthBreakdown } from '@/domain/progression';
import { propertySaleProceedsCents } from '@/domain/propertyQuotes';
import { quoteTrade } from '@/domain/tradeQuotes';
import { startTaxLedger } from '@/domain/tax/ledger';
import { TAX_READER_VERSION } from '@/domain/tax/types';

import { businessEconomy, progressRules } from './economy';

function businessBasis(state: GameState, content: Content) {
  const economy = businessEconomy(content);
  return state.businesses.flatMap((owned) => {
    const definition = findBusiness(economy.catalog, owned.definitionId);
    if (definition === undefined) return [];
    return [
      [
        businessTaxSource(owned.definitionId),
        listedSaleCents(owned, state, content.economy.market.stocks.feeBps) ??
          saleProceedsCents(owned, economy.rules),
      ] as const,
    ];
  });
}

function propertyBasis(state: GameState, content: Content) {
  return state.properties.flatMap((owned) => {
    const definition = content.properties.find((p) => p.id === owned.definitionId);
    return definition === undefined
      ? []
      : [
          [
            propertyTaxBasis(owned.definitionId),
            propertySaleProceedsCents(owned, { definition, rules: content.economy.propertyRules }),
          ] as const,
        ];
  });
}

function positionBasis(state: GameState, content: Content) {
  return state.positions
    .filter((position) => !position.instrumentId.startsWith('listing:'))
    .map((position) => {
      const coin = content.coins.some((c) => c.id === position.instrumentId);
      const price = state.market.quotes[position.instrumentId];
      const instrument = [...content.stocks, ...content.coins].find(
        (a) => a.id === position.instrumentId,
      );
      const quote = quoteTrade(
        { side: 'sell', quantity: position.quantity },
        {
          price: price ?? instrument!.initialPrice,
          feeBps: coin
            ? content.economy.market.crypto.feeBps
            : content.economy.market.stocks.feeBps,
        },
      );
      return [instrumentTaxBasis(position.instrumentId), quote.cashChangeCents] as const;
    });
}

export function activationBasis(state: GameState, content: Content) {
  return Object.fromEntries([
    ...businessBasis(state, content),
    ...propertyBasis(state, content),
    ...positionBasis(state, content),
  ]);
}

export function activateTaxes(state: GameState, content: Content): GameState {
  const rules = content.economy.taxes;
  const dayMs = content.economy.businessRules.dayMs;
  if (
    rules === undefined ||
    state.tax.status !== 'notStarted' ||
    state.clock.simulationMs % dayMs !== 0
  )
    return state;
  const wealthCents = netWorthBreakdown(state, progressRules(content)).netWorthCents;
  const tax = startTaxLedger({ atMs: state.clock.simulationMs, wealthCents, dayMs }, rules);
  return {
    ...state,
    minReaderVersion: Math.max(state.minReaderVersion, TAX_READER_VERSION),
    tax: {
      ...tax,
      basis: activationBasis(state, content),
      openingWealthCents: moneyCents(wealthCents),
    },
  };
}
