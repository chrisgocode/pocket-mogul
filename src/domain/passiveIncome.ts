import { accumulatedPayouts } from './business/listingPayout';
import { cashPerMinuteCents } from './business/core';
import { findBusiness, type BusinessEconomy } from './business/definition';
import type { StruckIncident } from './business/risks';
import { settleBusinesses, type BusinessClosure } from './business/treasury';
import { advanceDividends, type DividendRates } from './dividends';
import type { GameState, IncomeBySource, IncomeState } from './gameState';
import { moneyCents, type MoneyCents } from './money';
import { findProperty, type PropertyEconomy } from './properties';
import { quotePropertyIncome } from './propertyQuotes';

const MS_PER_MINUTE = 60_000n;

export type PassiveEconomy = {
  readonly businesses: BusinessEconomy;
  readonly properties: PropertyEconomy;
  readonly dividendRates: DividendRates;
};

type Stream = { readonly id: string; readonly ratePerMinuteCents: MoneyCents };

type Remainders = Readonly<Record<string, number>>;

function businessStreams(state: GameState, economy: BusinessEconomy): Stream[] {
  return state.businesses.flatMap((owned) => {
    const definition = findBusiness(economy.catalog, owned.definitionId);
    if (definition === undefined) return [];
    const ratePerMinuteCents = cashPerMinuteCents(owned, { definition, rules: economy.rules });
    return [{ id: owned.definitionId, ratePerMinuteCents }];
  });
}

function rentStreams(state: GameState, economy: PropertyEconomy): Stream[] {
  return state.properties.flatMap((owned) => {
    const definition = findProperty(economy.catalog, owned.definitionId);
    if (definition === undefined || !owned.rented) return [];
    const income = quotePropertyIncome(owned, { definition, rules: economy.rules });
    return [{ id: owned.definitionId, ratePerMinuteCents: income.netPerMinuteCents }];
  });
}

function totalRate(streams: readonly Stream[]): MoneyCents {
  return moneyCents(
    streams.reduce<bigint>((total, stream) => total + stream.ratePerMinuteCents, 0n),
  );
}

export function businessIncomePerMinuteCents(
  state: GameState,
  economy: PassiveEconomy,
): MoneyCents {
  return totalRate(businessStreams(state, economy.businesses));
}

export function rentIncomePerMinuteCents(state: GameState, economy: PassiveEconomy): MoneyCents {
  return totalRate(rentStreams(state, economy.properties));
}

export function passiveIncomePerMinuteCents(state: GameState, economy: PassiveEconomy): MoneyCents {
  return moneyCents(
    businessIncomePerMinuteCents(state, economy) + rentIncomePerMinuteCents(state, economy),
  );
}

export function totalIncome(earnings: IncomeBySource): MoneyCents {
  return moneyCents(earnings.businesses + earnings.rent + earnings.dividends);
}

type Accrual = { earnedCents: bigint; remainders: Record<string, number> };

function accrue(streams: readonly Stream[], period: { elapsedMs: number; remainders: Remainders }) {
  return streams.reduce<Accrual>(
    (accrual, stream) => {
      const numerator =
        stream.ratePerMinuteCents * BigInt(period.elapsedMs) +
        BigInt(period.remainders[stream.id] ?? 0);
      return {
        earnedCents: accrual.earnedCents + numerator / MS_PER_MINUTE,
        remainders: { ...accrual.remainders, [stream.id]: Number(numerator % MS_PER_MINUTE) },
      };
    },
    { earnedCents: 0n, remainders: { ...period.remainders } },
  );
}

type Accrued = {
  readonly shareholderPayouts: GameState['shareholderPayouts'];
  readonly earnings: IncomeBySource;
  readonly income: IncomeState;
  readonly businesses: GameState['businesses'];
  readonly closures: readonly BusinessClosure[];
  readonly incidents: readonly StruckIncident[];
  readonly dividendAccruals: GameState['dividendAccruals'];
};

function accruedIncome(
  state: GameState,
  advance: { elapsedMs: number; economy: PassiveEconomy },
): Accrued {
  const { income } = state;
  const fromMs = state.clock.simulationMs;
  const business = settleBusinesses(state.businesses, {
    fromMs,
    elapsedMs: advance.elapsedMs,
    economy: advance.economy.businesses,
    seed: state.market.seed,
  });
  const rent = accrue(rentStreams(state, advance.economy.properties), {
    elapsedMs: advance.elapsedMs,
    remainders: income.rentRemainders,
  });
  const dividends = advanceDividends(
    { accruals: state.dividendAccruals, positions: state.positions },
    { fromMs, toMs: fromMs + advance.elapsedMs, rates: advance.economy.dividendRates },
  );
  return {
    shareholderPayouts: accumulatedPayouts(state.shareholderPayouts, business.outsidePayouts),
    earnings: {
      businesses: business.toCashCents,
      rent: moneyCents(rent.earnedCents),
      dividends: dividends.paidCents,
    },
    income: {
      businessEarningsCents: moneyCents(income.businessEarningsCents + business.toCashCents),
      rentRemainders: rent.remainders,
      rentEarningsCents: moneyCents(income.rentEarningsCents + rent.earnedCents),
      dividendEarningsCents: moneyCents(income.dividendEarningsCents + dividends.paidCents),
    },
    businesses: business.businesses,
    closures: business.closures,
    incidents: business.incidents,
    dividendAccruals: dividends.accruals,
  };
}

export type AdvancedTime = {
  readonly state: GameState;
  readonly earnedCents: MoneyCents;
  readonly earnings: IncomeBySource;
  readonly closures: readonly BusinessClosure[];
  readonly incidents: readonly StruckIncident[];
};

export function advanceTime(
  state: GameState,
  advance: { elapsedMs: number; wallMs: number; economy: PassiveEconomy },
): AdvancedTime {
  const {
    earnings,
    income,
    businesses,
    closures,
    incidents,
    dividendAccruals,
    shareholderPayouts,
  } = accruedIncome(state, advance);
  const earnedCents = totalIncome(earnings);
  return {
    earnedCents,
    earnings,
    closures,
    incidents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + earnedCents),
      clock: {
        simulationMs: state.clock.simulationMs + advance.elapsedMs,
        lastWallCheckpointMs: advance.wallMs,
      },
      income,
      businesses,
      dividendAccruals,
      shareholderPayouts,
    },
  };
}
