import { quoteBusinessIncome } from './businessQuotes';
import { findBusiness, type BusinessEconomy } from './businesses';
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
    const income = quoteBusinessIncome(owned, { definition, rules: economy.rules });
    return [{ id: owned.definitionId, ratePerMinuteCents: income.netPerMinuteCents }];
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

function accruedIncome(
  state: GameState,
  advance: { elapsedMs: number; economy: PassiveEconomy },
): { earnings: IncomeBySource; income: IncomeState; dividends: GameState['dividends'] } {
  const { income } = state;
  const business = accrue(businessStreams(state, advance.economy.businesses), {
    elapsedMs: advance.elapsedMs,
    remainders: income.businessRemainders,
  });
  const rent = accrue(rentStreams(state, advance.economy.properties), {
    elapsedMs: advance.elapsedMs,
    remainders: income.rentRemainders,
  });
  const fromMs = state.clock.simulationMs;
  const dividends = advanceDividends(
    { accruals: state.dividends, positions: state.positions },
    { fromMs, toMs: fromMs + advance.elapsedMs, rates: advance.economy.dividendRates },
  );
  return {
    earnings: {
      businesses: moneyCents(business.earnedCents),
      rent: moneyCents(rent.earnedCents),
      dividends: dividends.paidCents,
    },
    income: {
      businessRemainders: business.remainders,
      businessEarningsCents: moneyCents(income.businessEarningsCents + business.earnedCents),
      rentRemainders: rent.remainders,
      rentEarningsCents: moneyCents(income.rentEarningsCents + rent.earnedCents),
      dividendEarningsCents: moneyCents(income.dividendEarningsCents + dividends.paidCents),
    },
    dividends: dividends.accruals,
  };
}

export function advanceTime(
  state: GameState,
  advance: { elapsedMs: number; wallMs: number; economy: PassiveEconomy },
): { state: GameState; earnedCents: MoneyCents; earnings: IncomeBySource } {
  const { earnings, income, dividends } = accruedIncome(state, advance);
  const earnedCents = totalIncome(earnings);
  return {
    earnedCents,
    earnings,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + earnedCents),
      clock: {
        simulationMs: state.clock.simulationMs + advance.elapsedMs,
        lastWallCheckpointMs: advance.wallMs,
      },
      income,
      dividends,
    },
  };
}
