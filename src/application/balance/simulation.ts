import { playTaxes, taxStartingState, type TaxPolicy } from './taxes';
import type { TaxState } from '@/domain/tax/types';
import { operationCommands } from './operations';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { ActivityEntry } from '@/domain/activity';
import type { Content } from '@/content';
import { briefingRules, goalRules, progressRules } from '@/application/economy';
import { briefingRewards } from '@/domain/briefing';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { claimableGoalIds, goalRewardCents } from '@/domain/goalRewards';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { netWorthBreakdown, type NetWorthBreakdown } from '@/domain/progression';

import { engineStep } from './engineStep';
import type { OptionKind, PurchaseOption } from './options';
import { chooseOption, paybackMinutes, type PolicyName } from './policies';

export type Session = { readonly activeMs: number; readonly awayMs: number };

export type BalanceScenario = {
  readonly taxPolicy?: TaxPolicy;
  readonly name: string;
  readonly seed: string;
  readonly policy: PolicyName;
  readonly tapsPerSecond: number;
  readonly stepMs: number;
  readonly sessions: readonly Session[];
  readonly maxActiveMs: number;
  readonly stopAtPeakCents: MoneyCents;
  readonly stopAtBusinessCount?: number;
  readonly start?: GameState;
  readonly management?: 'manager' | 'handsOn';
  readonly payoutPercent?: number;
  readonly goalRewards?: 'claimed' | 'unclaimed';
};

export type Moment = { readonly activeMs: number; readonly elapsedMs: number };

export type Purchase = Moment & {
  readonly kind: OptionKind;
  readonly assetId: string;
  readonly priceCents: MoneyCents;
  readonly paybackMinutes: number;
};

export type Sample = Moment & { readonly worth: NetWorthBreakdown };

export type BalanceRun = {
  readonly tax: TaxState;
  readonly scenario: BalanceScenario;
  readonly goals: Readonly<Record<string, Moment>>;
  readonly tiers: Readonly<Record<number, Moment>>;
  readonly purchases: readonly Purchase[];
  readonly samples: readonly Sample[];
  readonly final: Sample;
  readonly businesses: readonly OwnedBusiness[];
  readonly events: readonly ActivityEntry[];
  readonly actions: Readonly<Partial<Record<GameCommand['type'], number>>>;
  readonly rewards: {
    readonly goalsClaimed: number;
    readonly goalCashCents: MoneyCents;
    readonly briefingCashCents: MoneyCents;
    readonly businessIncomeCents: MoneyCents;
  };
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const SAMPLE_EVERY_MS = 3_600_000;
const SIMULATION_WALL_START_MS = 1_800_000_000_000;
const MAX_PURCHASES_PER_STEP = 1000;

type Simulation = {
  readonly scenario: BalanceScenario;
  readonly content: Content;
  readonly wallStartMs: number;
  state: GameState;
  activeMs: number;
  elapsedMs: number;
  nextSampleMs: number;
  briefingCashCents: MoneyCents;
  readonly goals: Record<string, Moment>;
  readonly tiers: Record<number, Moment>;
  readonly purchases: Purchase[];
  readonly samples: Sample[];
  readonly events: ActivityEntry[];
  readonly actions: Partial<Record<GameCommand['type'], number>>;
};

const momentOf = (sim: Simulation): Moment => ({
  activeMs: sim.activeMs,
  elapsedMs: sim.elapsedMs,
});

function noteProgress(sim: Simulation, completedGoalIds: readonly string[], next: GameState) {
  for (const goalId of completedGoalIds) sim.goals[goalId] = momentOf(sim);
  for (const tier of next.unlockedTiers) {
    if (!sim.state.unlockedTiers.includes(tier)) sim.tiers[tier] = momentOf(sim);
  }
}

function commit(sim: Simulation, command: GameCommand, elapsedMs = 0): boolean {
  const committed = engineStep(sim.state, {
    command,
    content: sim.content,
    elapsedMs,
    wallMs: sim.wallStartMs + sim.elapsedMs,
  });
  if (committed.state === undefined) return false;
  sim.actions[command.type] = (sim.actions[command.type] ?? 0) + 1;
  sim.events.push(
    ...(committed.activity ?? []).filter(
      (entry) => entry.kind === 'closure' || entry.kind === 'incident',
    ),
  );
  noteProgress(sim, committed.completedGoalIds ?? [], committed.state);
  sim.state = committed.state;
  return true;
}

function sample(sim: Simulation): Sample {
  return { ...momentOf(sim), worth: netWorthBreakdown(sim.state, progressRules(sim.content)) };
}

const finished = (sim: Simulation) =>
  sim.activeMs >= sim.scenario.maxActiveMs ||
  sim.state.businesses.length >= (sim.scenario.stopAtBusinessCount ?? Infinity) ||
  sim.state.peakNetWorthCents >= sim.scenario.stopAtPeakCents;

function buy(sim: Simulation, option: PurchaseOption): boolean {
  if (option.cashCents > sim.state.cashCents) return false;
  if (!option.commands.every((command) => commit(sim, command))) return false;
  const { kind, assetId, priceCents } = option;
  sim.purchases.push({
    ...momentOf(sim),
    kind,
    assetId,
    priceCents,
    paybackMinutes: paybackMinutes(option),
  });
  return true;
}

function spend(sim: Simulation) {
  const tapsPerMinute = sim.scenario.tapsPerSecond * (MS_PER_MINUTE / MS_PER_SECOND);
  for (let attempt = 0; attempt < MAX_PURCHASES_PER_STEP; attempt += 1) {
    const context = {
      state: sim.state,
      content: sim.content,
      tapsPerMinute,
      management: sim.scenario.management,
    };
    const option = chooseOption(sim.scenario.policy, context);
    if (option === undefined || !buy(sim, option)) return;
  }
}

function operatingOptions(sim: Simulation): readonly GameCommand[] {
  return operationCommands({
    state: sim.state,
    content: sim.content,
    tapsPerMinute: 0,
    management: sim.scenario.management,
    payoutPercent:
      sim.scenario.payoutPercent ?? sim.content.economy.businessRules.defaultPayoutPercent,
  });
}

function operate(sim: Simulation) {
  if (sim.scenario.management === undefined) return;
  for (let attempt = 0; attempt < MAX_PURCHASES_PER_STEP; attempt += 1) {
    if (!operatingOptions(sim).some((command) => commit(sim, command))) return;
  }
}

function claimRewards(sim: Simulation) {
  if (sim.scenario.goalRewards === 'unclaimed') return;
  const goalIds = claimableGoalIds(sim.state, goalRules(sim.content));
  if (goalIds.length > 0) commit(sim, { type: 'ClaimGoals', goalIds });
  const briefingCents = briefingRewards(sim.state, briefingRules(sim.content)).claimableCents;
  if (briefingCents > 0n && commit(sim, { type: 'ClaimBriefing' }))
    sim.briefingCashCents = moneyCents(sim.briefingCashCents + briefingCents);
}

function playStep(sim: Simulation) {
  const { stepMs, tapsPerSecond } = sim.scenario;
  const taps = Math.round((tapsPerSecond * stepMs) / MS_PER_SECOND);
  sim.activeMs += stepMs;
  sim.elapsedMs += stepMs;
  const command: GameCommand = taps > 0 ? { type: 'TapBatch', taps } : { type: 'AdvanceTime' };
  commit(sim, command, stepMs);
  playTaxes({
    state: () => sim.state,
    commit: (action) => commit(sim, action),
    policy: sim.scenario.taxPolicy ?? 'honest',
  });
  claimRewards(sim);
  operate(sim);
  spend(sim);
  if (sim.activeMs < sim.nextSampleMs) return;
  sim.samples.push(sample(sim));
  sim.nextSampleMs += SAMPLE_EVERY_MS;
}

function playSession(sim: Simulation, session: Session) {
  const sessionEndMs = sim.activeMs + session.activeMs;
  while (sim.activeMs < sessionEndMs && !finished(sim)) playStep(sim);
  if (session.awayMs === 0 || finished(sim)) return;
  sim.elapsedMs += session.awayMs;
  commit(sim, { type: 'SettleOffline' });
  playTaxes({
    state: () => sim.state,
    commit: (action) => commit(sim, action),
    policy: sim.scenario.taxPolicy ?? 'honest',
  });
  commit(sim, { type: 'AcknowledgeReturnSummary' });
}

const EMPTY_RUN = {
  activeMs: 0,
  elapsedMs: 0,
  nextSampleMs: SAMPLE_EVERY_MS,
  briefingCashCents: moneyCents(0),
};

function startingState(scenario: BalanceScenario, content: Content): GameState {
  return (
    scenario.start ??
    freshGameState({
      saveId: scenario.seed,
      economyVersion: content.economyVersion,
      wallMs: SIMULATION_WALL_START_MS,
    })
  );
}

function rewardsOf(sim: Simulation): BalanceRun['rewards'] {
  return {
    goalsClaimed: sim.state.claimedGoals.length,
    goalCashCents: goalRewardCents(sim.state.claimedGoals, goalRules(sim.content)),
    briefingCashCents: sim.briefingCashCents,
    businessIncomeCents: sim.state.income.businessEarningsCents,
  };
}

export function simulateBalance(scenario: BalanceScenario, content: Content): BalanceRun {
  if (!scenario.sessions.some((session) => session.activeMs > 0)) {
    throw new Error(`Scenario ${scenario.name} has no active play`);
  }
  const state = taxStartingState(startingState(scenario, content), {
    content,
    policy: scenario.taxPolicy ?? 'honest',
  });
  const sim: Simulation = {
    scenario,
    content,
    wallStartMs: state.clock.lastWallCheckpointMs,
    state,
    ...EMPTY_RUN,
    goals: {},
    tiers: {},
    purchases: [],
    samples: [],
    events: [],
    actions: {},
  };
  while (!finished(sim)) {
    for (const session of scenario.sessions) playSession(sim, session);
  }
  return {
    tax: sim.state.tax,
    scenario,
    goals: sim.goals,
    tiers: sim.tiers,
    purchases: sim.purchases,
    samples: sim.samples,
    final: sample(sim),
    businesses: sim.state.businesses,
    events: sim.events,
    actions: sim.actions,
    rewards: rewardsOf(sim),
  };
}
