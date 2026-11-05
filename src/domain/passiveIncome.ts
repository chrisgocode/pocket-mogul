import { businessNetPerMinuteCents, findBusiness, type BusinessCatalog } from './businesses';
import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';
import { withPeakNetWorth } from './netWorth';

const MS_PER_MINUTE = 60_000n;

type Stream = { readonly id: string; readonly ratePerMinuteCents: MoneyCents };

function businessStreams(state: GameState, catalog: BusinessCatalog): Stream[] {
  return state.businesses.flatMap((owned) => {
    const definition = findBusiness(catalog, owned.definitionId);
    return definition === undefined
      ? []
      : [{ id: owned.definitionId, ratePerMinuteCents: businessNetPerMinuteCents(definition) }];
  });
}

export function businessIncomePerMinuteCents(
  state: GameState,
  catalog: BusinessCatalog,
): MoneyCents {
  return moneyCents(
    businessStreams(state, catalog).reduce<bigint>(
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
  advance: { elapsedMs: number; wallMs: number; catalog: BusinessCatalog },
): { state: GameState; earnedCents: MoneyCents } {
  const accrual = accrue(businessStreams(state, advance.catalog), {
    elapsedMs: advance.elapsedMs,
    state,
  });
  const earnedCents = moneyCents(accrual.earnedCents);
  return {
    earnedCents,
    state: withPeakNetWorth({
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
    }),
  };
}
