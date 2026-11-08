import type { Content } from '@/content';
import { consumeBoostTime, isBoostActive, rewardChange, type RewardChange } from '@/domain/boost';
import type {
  CommandEnvelope,
  CommandOutcome,
  CommandResult,
  GameCommand,
} from '@/domain/commands';
import type { ActivityEntry } from '@/domain/activity';
import type { GameState } from '@/domain/gameState';
import { withCompletedGoals } from '@/domain/goals';
import { advanceMarket, type MarketHistory } from '@/domain/market';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { settleOffline, type WallClockReading } from '@/domain/offline';
import { advanceTime } from '@/domain/passiveIncome';
import { withProgress } from '@/domain/progression';
import { newTutorialSteps, withTutorialProgress, type TutorialStep } from '@/domain/tutorial';

import {
  contentAt,
  goalRules,
  marketEconomy,
  passiveEconomy,
  progressRules,
  type EconomyVersions,
} from './economy';
import { applyCommand } from './commandHandlers';
import { validCommand } from './commandSchema';
import { withCommittedActivity, type PassedTime } from './committedActivity';
import type { SaveStore, SaveTransaction } from './ports';

export type Committed = {
  outcome: CommandOutcome;
  state?: GameState;
  wallClock?: WallClockReading;
  history?: MarketHistory;
  activity?: readonly ActivityEntry[];
  completedGoalIds?: readonly string[];
  completedTutorialSteps?: readonly TutorialStep[];
  rewardChange?: RewardChange | undefined;
};

type CommitContext = EconomyVersions & { readonly store: SaveStore };

export type CommandTime = {
  readonly elapsedMs: number;
  readonly boostElapsedMs: number;
  readonly wallMs: number;
};

type TimeStep = {
  readonly state: GameState;
  readonly earnedCents: MoneyCents;
  readonly wallClock: WallClockReading;
  readonly passed: PassedTime;
};

function withMarket(step: TimeStep, content: Content): TimeStep & { history: MarketHistory } {
  const { state } = step;
  const toTick = Math.floor(state.clock.simulationMs / content.economy.market.tickMs);
  const { market, history } = advanceMarket(state.market, {
    toTick,
    economy: marketEconomy(content),
  });
  return { ...step, state: { ...state, market }, history };
}

function passTime(
  state: GameState,
  step: { command: GameCommand; time: CommandTime; content: Content },
): TimeStep {
  const economy = passiveEconomy(step.content);
  if (step.command.type === 'SettleOffline') {
    const capMs = step.content.economy.time.offlineCapMs;
    const settled = settleOffline(state, { wallMs: step.time.wallMs, capMs, economy });
    const { absence, closures, incidents } = settled;
    const passed = { earnings: absence.earnings, absence, closures, incidents };
    return { ...settled, wallClock: settled.clock, passed };
  }
  const { elapsedMs, boostElapsedMs, wallMs } = step.time;
  const advanced = advanceTime(state, { elapsedMs, wallMs, economy });
  const boosted = consumeBoostTime(advanced.state, boostElapsedMs);
  const { earnings, closures, incidents } = advanced;
  const passed = { earnings, absence: undefined, closures, incidents };
  return { ...advanced, state: boosted, wallClock: { direction: 'forward' }, passed };
}

function boostedOnlyIfActive(command: GameCommand, before: GameState): GameCommand {
  if (command.type !== 'TapBatch' || isBoostActive(before)) return command;
  return { ...command, boosted: false };
}

type Applied = {
  readonly command: GameCommand;
  readonly content: Content;
  readonly advanced: TimeStep;
  readonly progressed: GameState;
  readonly result: Extract<CommandResult, { ok: true }>;
};

function finish(previous: GameState, applied: Applied) {
  const { content, result } = applied;
  const goals = withCompletedGoals(
    withProgress(result.state, progressRules(content)),
    goalRules(content),
  );
  const tutored = withTutorialProgress(goals.state);
  const logged = withCommittedActivity({
    command: applied.command,
    time: applied.advanced.passed,
    before: applied.progressed,
    after: tutored,
    commandCashCents: result.cashChangeCents,
  });
  return {
    state: { ...logged.state, revision: previous.revision + 1 },
    activity: logged.entries,
    completedGoalIds: goals.completedGoalIds,
    completedTutorialSteps: newTutorialSteps(previous.tutorial, tutored.tutorial),
    rewardChange: rewardChange(previous.reward.boost, logged.state.reward.boost),
  };
}

export function applyEnvelope(
  state: GameState,
  change: { envelope: CommandEnvelope; time: CommandTime; economies: EconomyVersions },
): Committed {
  const valid = validCommand(change.envelope.command);
  if (valid === undefined) return { outcome: { ok: false, error: 'INVALID_QUANTITY' } };
  const command = boostedOnlyIfActive(valid, state);
  const { content } = change.economies;
  const settling = contentAt(change.economies, state.economyVersion);
  const advanced = withMarket(
    passTime(state, { command, time: change.time, content: settling }),
    settling,
  );
  const adopted = { ...advanced.state, economyVersion: content.economyVersion };
  const progressed = withProgress(adopted, progressRules(content));
  const result = applyCommand(progressed, { type: command.type, payload: command }, content);
  if (!result.ok) return { outcome: result };
  const cashChangeCents = moneyCents(advanced.earnedCents + result.cashChangeCents);
  const next = finish(state, { command, content, advanced, progressed, result });
  const outcome = { ok: true, revision: next.state.revision, cashChangeCents } as const;
  return { ...next, outcome, wallClock: advanced.wallClock, history: advanced.history };
}

async function record(
  tx: SaveTransaction,
  change: { envelope: CommandEnvelope; applied: Committed; wallMs: number },
): Promise<void> {
  const { state, outcome, wallClock, history, activity = [] } = change.applied;
  if (state === undefined) return;
  await tx.writeState(state);
  if (history !== undefined) await tx.appendMarketHistory(history);
  if (activity.length > 0) await tx.appendActivity(activity);
  if (wallClock?.direction === 'backward') {
    const { direction: _direction, ...reading } = wallClock;
    await tx.writeDiagnostic({
      type: 'BACKWARD_WALL_CLOCK',
      ...reading,
      recordedWallMs: change.wallMs,
    });
  }
  await tx.writeReceipt({
    commandId: change.envelope.id,
    outcome,
    recordedWallMs: change.wallMs,
  });
}

export async function commitCommand(
  context: CommitContext,
  change: { current: GameState; envelope: CommandEnvelope; time: CommandTime },
): Promise<Committed> {
  const { wallMs } = change.time;
  try {
    return await context.store.transact(async (tx) => {
      const recorded = await tx.findOutcome(change.envelope.id);
      if (recorded !== undefined) return { outcome: recorded };
      const applied = applyEnvelope(change.current, {
        envelope: change.envelope,
        time: change.time,
        economies: context,
      });
      await record(tx, { envelope: change.envelope, applied, wallMs });
      return applied;
    });
  } catch {
    return { outcome: { ok: false, error: 'SAVE_FAILED' } };
  }
}
