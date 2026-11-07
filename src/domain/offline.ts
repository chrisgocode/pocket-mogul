import type { GameState, IncomeBySource, PendingReturnSummary, ReturnSummary } from './gameState';
import { moneyCents, type MoneyCents } from './money';
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
  readonly state: GameState;
  readonly earnedCents: MoneyCents;
  readonly clock: WallClockReading;
  readonly absence: ReturnSummary;
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
  };
}

function summarize(pending: PendingReturnSummary, absence: ReturnSummary): PendingReturnSummary {
  if (pending.status === 'pending') {
    return { status: 'pending', summary: combined(pending.summary, absence) };
  }
  const worthShowing =
    absence.awayMs >= RETURN_SUMMARY_MIN_AWAY_MS && totalIncome(absence.earnings) > 0n;
  return worthShowing ? { status: 'pending', summary: absence } : pending;
}

export function settleOffline(
  state: GameState,
  settle: { wallMs: number; capMs: number; economy: PassiveEconomy },
): OfflineSettlement {
  const clock = readWallClock(state, settle.wallMs);
  const awayMs = Math.max(0, settle.wallMs - state.clock.lastWallCheckpointMs);
  const creditedMs = Math.min(awayMs, settle.capMs);
  const advanced = advanceTime(state, {
    elapsedMs: creditedMs,
    wallMs: settle.wallMs,
    economy: settle.economy,
  });
  const absence = { awayMs, creditedMs, earnings: advanced.earnings };
  return {
    clock,
    absence,
    earnedCents: advanced.earnedCents,
    state: { ...advanced.state, returnSummary: summarize(state.returnSummary, absence) },
  };
}
