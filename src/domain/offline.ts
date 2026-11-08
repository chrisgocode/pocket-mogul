import type { MarketHistory } from './marketHistory';
import type { GameState, IncomeBySource, PendingReturnSummary, ReturnSummary } from './gameState';
import { moneyCents, type MoneyCents } from './money';
import type { StruckIncident } from './business/risks';
import type { BusinessClosure } from './business/treasury';
import { advanceTime, totalIncome, type PassiveEconomy } from './passiveIncome';

const RETURN_SUMMARY_MIN_AWAY_MS = 60_000;

export type WallClockReading =
  | { readonly direction: 'forward' }
  | {
      readonly direction: 'backward';
      readonly checkpointWallMs: number;
      readonly observedWallMs: number;
    };

export type OfflineSettlement = {
  readonly history?: MarketHistory;
  readonly state: GameState;
  readonly earnedCents: MoneyCents;
  readonly clock: WallClockReading;
  readonly absence: ReturnSummary;
  readonly closures: readonly BusinessClosure[];
  readonly incidents: readonly StruckIncident[];
};

function readWallClock(state: GameState, wallMs: number): WallClockReading {
  const checkpointWallMs = state.clock.lastWallCheckpointMs;
  return wallMs < checkpointWallMs
    ? { direction: 'backward', checkpointWallMs, observedWallMs: wallMs }
    : { direction: 'forward' };
}

function addIncome(earlier: IncomeBySource, later: IncomeBySource): IncomeBySource {
  return {
    businesses: moneyCents(earlier.businesses + later.businesses),
    rent: moneyCents(earlier.rent + later.rent),
    dividends: moneyCents(earlier.dividends + later.dividends),
  };
}

function combined(earlier: ReturnSummary, later: ReturnSummary): ReturnSummary {
  return {
    awayMs: earlier.awayMs + later.awayMs,
    creditedMs: earlier.creditedMs + later.creditedMs,
    earnings: addIncome(earlier.earnings, later.earnings),
    closures: [...earlier.closures, ...later.closures],
    incidents: [...earlier.incidents, ...later.incidents],
  };
}

function summarize(pending: PendingReturnSummary, absence: ReturnSummary): PendingReturnSummary {
  if (pending.status === 'pending') {
    return { status: 'pending', summary: combined(pending.summary, absence) };
  }
  const eventful =
    totalIncome(absence.earnings) > 0n ||
    absence.closures.length > 0 ||
    absence.incidents.length > 0;
  const worthShowing = absence.awayMs >= RETURN_SUMMARY_MIN_AWAY_MS && eventful;
  return worthShowing ? { status: 'pending', summary: absence } : pending;
}

export function settleOffline(
  state: GameState,
  settle: { wallMs: number; capMs: number; economy: PassiveEconomy; advance?: typeof advanceTime },
): OfflineSettlement {
  const clock = readWallClock(state, settle.wallMs);
  const awayMs = Math.max(0, settle.wallMs - state.clock.lastWallCheckpointMs);
  const creditedMs = Math.min(awayMs, settle.capMs);
  const advanced = (settle.advance ?? advanceTime)(state, {
    elapsedMs: creditedMs,
    wallMs: settle.wallMs,
    economy: settle.economy,
  });
  const closures = advanced.closures.map((closure) => closure.businessId);
  const { incidents } = advanced;
  const absence = { awayMs, creditedMs, earnings: advanced.earnings, closures, incidents };
  return {
    ...(advanced.history === undefined ? {} : { history: advanced.history }),
    clock,
    absence,
    closures: advanced.closures,
    incidents: advanced.incidents,
    earnedCents: advanced.earnedCents,
    state: { ...advanced.state, returnSummary: summarize(state.returnSummary, absence) },
  };
}
