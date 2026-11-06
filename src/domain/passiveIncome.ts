import { quoteBusinessIncome } from './businessQuotes';
import { findBusiness, type BusinessEconomy } from './businesses';
import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';

const MS_PER_MINUTE = 60_000n;

type Stream = { readonly id: string; readonly ratePerMinuteCents: MoneyCents };

function businessStreams(state: GameState, economy: BusinessEconomy): Stream[] {
  return state.businesses.flatMap((owned) => {
    const definition = findBusiness(economy.catalog, owned.definitionId);
    if (definition === undefined) return [];
    const income = quoteBusinessIncome(owned, { definition, rules: economy.rules });
    return [{ id: owned.definitionId, ratePerMinuteCents: income.netPerMinuteCents }];
  });
}

export function businessIncomePerMinuteCents(
  state: GameState,
  economy: BusinessEconomy,
): MoneyCents {
  return moneyCents(
    businessStreams(state, economy).reduce<bigint>(
      (total, stream) => total + stream.ratePerMinuteCents,
      0n,
    ),
  );
}

type Accrual = { earnedCents: bigint; remainders: Record<string, number> };

function accrue(streams: readonly Stream[], context: { elapsedMs: number; state: GameState }) {
  const { businessRemainders } = context.state.income;
  return streams.reduce<Accrual>(
    (accrual, stream) => {
      const numerator =
        stream.ratePerMinuteCents * BigInt(context.elapsedMs) +
        BigInt(businessRemainders[stream.id] ?? 0);
      return {
        earnedCents: accrual.earnedCents + numerator / MS_PER_MINUTE,
        remainders: { ...accrual.remainders, [stream.id]: Number(numerator % MS_PER_MINUTE) },
      };
    },
    { earnedCents: 0n, remainders: { ...businessRemainders } },
  );
}

export function advanceTime(
  state: GameState,
  advance: { elapsedMs: number; wallMs: number; economy: BusinessEconomy },
): { state: GameState; earnedCents: MoneyCents } {
  const accrual = accrue(businessStreams(state, advance.economy), {
    elapsedMs: advance.elapsedMs,
    state,
  });
  const earnedCents = moneyCents(accrual.earnedCents);
  return {
    earnedCents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + earnedCents),
      clock: {
        simulationMs: state.clock.simulationMs + advance.elapsedMs,
        lastWallCheckpointMs: advance.wallMs,
      },
      income: {
        businessRemainders: accrual.remainders,
        businessEarningsCents: moneyCents(state.income.businessEarningsCents + earnedCents),
      },
    },
  };
}
