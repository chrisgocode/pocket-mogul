import { hasFinancialReview } from './reviewedCommands';
import { withTaxAbsence } from './taxOffline';
import { advanceTaxTime } from './taxTime';
import { activateTaxes } from './taxActivation';
import { listingValuesAt } from './listingMarket';
import type { Content } from '@/content';
import { withAdRewardDay } from '@/domain/adRewards';
import { withBriefing } from '@/domain/briefing';
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
import { withProgress } from '@/domain/progression';
import { withRichList } from '@/domain/richList';
import { newTutorialSteps, withTutorialProgress, type TutorialStep } from '@/domain/tutorial';

import {
  briefingRules,
  contentAt,
  goalRules,
  marketEconomy,
  passiveEconomy,
  progressRules,
  richListRules,
  type EconomyVersions,
} from './economy';
import { applyCommand } from './commandHandlers';
import { validCommand } from './commandSchema';
import { withCommittedActivity, type PassedTime } from './committedActivity';
import type { SaveStore, SaveTransaction } from './ports';
import { offlineCapMs } from './purchaseEffects';

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
  readonly dayKey: string;
};

type TimeStep = {
  readonly state: GameState;
  readonly earnedCents: MoneyCents;
  readonly wallClock: WallClockReading;
  readonly passed: PassedTime;
  readonly history?: MarketHistory;
};

function withMarket(
  step: TimeStep,
  content: Content,
  previous: GameState,
): TimeStep & { history: MarketHistory } {
  const { state } = step;
  const toTick = Math.floor(state.clock.simulationMs / content.economy.market.tickMs);
  const { market, history } = advanceMarket(state.market, {
    toTick,
    economy: {
      ...marketEconomy(content, state),
      listingValuesAt: listingValuesAt(previous, content),
    },
  });
  return {
    ...step,
    state: { ...state, market },
    history:
      step.history === undefined
        ? history
        : {
            ...history,
            minutes: [...step.history.minutes, ...history.minutes],
            hours: [...step.history.hours, ...history.hours],
          },
  };
}

function passTime(
  state: GameState,
  step: { command: GameCommand; time: CommandTime; content: Content },
): TimeStep {
  const economy = passiveEconomy(step.content);
  if (step.command.type === 'SettleOffline') {
    const capMs = offlineCapMs(state, step.content);
    const settled = settleOffline(state, {
      wallMs: step.time.wallMs,
      capMs,
      economy,
      advance: (current, span) => advanceTaxTime(current, { ...span, content: step.content }),
    });
    const { absence, closures, incidents } = settled;
    const passed = { earnings: absence.earnings, absence, closures, incidents };
    return {
      ...settled,
      state: withTaxAbsence(state, settled.state),
      wallClock: settled.clock,
      passed,
    };
  }
  const { elapsedMs, boostElapsedMs, wallMs } = step.time;
  const advanced = advanceTaxTime(state, { elapsedMs, wallMs, content: step.content });
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
  readonly dayKey: string;
  readonly advanced: TimeStep;
  readonly progressed: GameState;
  readonly result: Extract<CommandResult, { ok: true }>;
};

function finish(previous: GameState, applied: Applied) {
  const { content, result } = applied;
  const listed = withRichList(
    withProgress(result.state, progressRules(content)),
    richListRules(content),
  );
  const goals = withCompletedGoals(listed.state, goalRules(content));
  const tutored = withTutorialProgress(goals.state);
  const logged = withCommittedActivity({
    command: applied.command,
    time: applied.advanced.passed,
    before: applied.progressed,
    after: tutored,
    commandCashCents: result.cashChangeCents,
    ranking: listed.move,
  });
  const briefed = withBriefing(logged.state, {
    before: previous,
    dayKey: applied.dayKey,
    rules: briefingRules(content),
    play: applied.command.type === 'SettleOffline' ? 'ignored' : 'counted',
  });
  return {
    state: { ...briefed, revision: previous.revision + 1 },
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
  if (hasFinancialReview(command))
    return applyReviewedCommand(state, { command, content, time: change.time });
  const settling = contentAt(change.economies, state.economyVersion);
  const advanced = withMarket(
    passTime(state, { command, time: change.time, content: settling }),
    settling,
    state,
  );
  const adopted = activateTaxes(
    { ...advanced.state, economyVersion: content.economyVersion },
    content,
  );
  const progressed = withAdRewardDay(
    withProgress(adopted, progressRules(content)),
    change.time.dayKey,
  );
  const result = applyCommand(progressed, { type: command.type, payload: command }, content);
  if (!result.ok) return { outcome: result };
  const cashChangeCents = moneyCents(advanced.earnedCents + result.cashChangeCents);
  const next = finish(state, {
    command,
    content,
    dayKey: change.time.dayKey,
    advanced,
    progressed,
    result,
  });
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

function applyReviewedCommand(
  state: GameState,
  step: { command: GameCommand; content: Content; time: CommandTime },
): Committed {
  const { command, content, time } = step;
  const expiresAt = (state.market.tick + 1) * content.economy.market.tickMs;
  if (
    state.economyVersion !== content.economyVersion ||
    state.clock.simulationMs + time.elapsedMs >= expiresAt
  )
    return { outcome: { ok: false, error: 'STALE_QUOTE' } };
  const result = applyCommand(state, { type: command.type, payload: command }, content);
  if (!result.ok) return { outcome: result };
  const advanced = withMarket(
    passTime(result.state, { command, content, time }),
    content,
    result.state,
  );
  const next = finish(state, {
    command,
    content,
    dayKey: time.dayKey,
    advanced,
    progressed: state,
    result: { ...result, state: advanced.state },
  });
  return {
    ...next,
    outcome: {
      ok: true,
      revision: next.state.revision,
      cashChangeCents: moneyCents(result.cashChangeCents + advanced.earnedCents),
    },
    wallClock: advanced.wallClock,
    history: advanced.history,
  };
}
