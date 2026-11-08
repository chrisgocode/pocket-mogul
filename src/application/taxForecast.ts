import { businessTaxSource, rentalTaxSource } from '@/domain/tax/sources';
import { quotePropertyIncome } from '@/domain/propertyQuotes';
import type { Content } from '@/content';
import { quoteBusinessDay } from '@/domain/business/core';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';
import { assessPool, emptyTaxPool } from '@/domain/tax/assessment';
import { TAX_SHARES } from '@/domain/tax/types';

import { businessEconomy } from './economy';

const MS_PER_MINUTE = 60_000n;

export function businessTaxForecast(
  state: GameState,
  request: { businessId: string; content: Content },
) {
  const owned = state.businesses.find((b) => b.definitionId === request.businessId);
  const economy = businessEconomy(request.content);
  const definition = economy.catalog.find((b) => b.id === request.businessId);
  if (owned === undefined || definition === undefined) return undefined;
  const shares = owned.listing.status === 'private' ? TAX_SHARES : owned.listing.sharesHeld;
  const profit =
    owned.status === 'closed'
      ? 0n
      : quoteBusinessDay(owned, { definition, rules: economy.rules }).profitCents;
  const ownerProfitCents = moneyCents((profit * shares) / TAX_SHARES);
  const pool =
    state.tax.status === 'active'
      ? state.tax.pools[businessTaxSource(owned.definitionId)]
      : undefined;
  const rateBps = state.tax.status === 'active' ? state.tax.rateBps : 0;
  const tax = assessPool(
    {
      ...emptyTaxPool(),
      profitCents: ownerProfitCents,
      lossCents: carriedLoss(pool),
    },
    { source: owned.definitionId, atMs: 0, rateBps },
  );
  return {
    ownerProfitCents,
    taxCents: tax.taxCents,
    netCents: moneyCents(ownerProfitCents - tax.taxCents),
    perMinuteCents: moneyCents(
      ((ownerProfitCents - tax.taxCents) * MS_PER_MINUTE) / BigInt(economy.rules.dayMs),
    ),
  };
}

function carriedLoss(pool: { readonly lossCents: ReturnType<typeof moneyCents> } | undefined) {
  return pool?.lossCents ?? moneyCents(0);
}

export function passiveProfitAfterTaxCents(state: GameState, content: Content) {
  const businesses = state.businesses.reduce(
    (sum, business) =>
      sum +
      (businessTaxForecast(state, { businessId: business.definitionId, content })?.perMinuteCents ??
        0n),
    0n,
  );
  const rentals = state.properties.reduce((sum, property) => {
    const definition = content.properties.find((p) => p.id === property.definitionId);
    if (!property.rented || definition === undefined) return sum;
    const quote = quotePropertyIncome(property, {
      definition,
      rules: content.economy.propertyRules,
    });
    const pool =
      state.tax.status === 'active'
        ? state.tax.pools[rentalTaxSource(property.definitionId)]
        : undefined;
    const dayMinutes = BigInt(content.economy.businessRules.dayMs) / MS_PER_MINUTE;
    const rateBps = state.tax.status === 'active' ? state.tax.rateBps : 0;
    const tax = assessPool(
      {
        ...emptyTaxPool(),
        profitCents: moneyCents(quote.netPerMinuteCents * dayMinutes),
        lossCents: carriedLoss(pool),
      },
      { source: property.definitionId, atMs: 0, rateBps },
    );
    return sum + quote.netPerMinuteCents - tax.taxCents / dayMinutes;
  }, 0n);
  return moneyCents(businesses + rentals);
}
