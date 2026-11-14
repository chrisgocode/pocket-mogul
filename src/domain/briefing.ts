import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { hashKey } from './marketRandom';
import { moneyCents, type MoneyCents } from './money';

export const BRIEFING_MEASURES = [
  'taps',
  'play_minutes',
  'wallet_upgrades',
  'improvements',
  'trades',
  'tax_returns',
] as const;

export type BriefingMeasure = (typeof BRIEFING_MEASURES)[number];

export const BRIEFING_NEEDS = [
  'nothing',
  'wallet_room',
  'business',
  'trading',
  'tax_return',
] as const;

export type BriefingNeed = (typeof BRIEFING_NEEDS)[number];

export type BriefingTemplate = {
  readonly id: string;
  readonly measure: BriefingMeasure;
  readonly count: number;
  readonly needs: BriefingNeed;
  readonly rewardBps: number;
};

export type BriefingRules = {
  readonly tasksPerDay: number;
  readonly minRewardCents: MoneyCents;
  readonly bonusBps: number;
  readonly minBonusCents: MoneyCents;
  readonly templates: readonly BriefingTemplate[];
  readonly walletMaxLevel: number;
};

type Claim = 'unclaimed' | 'claimed';

export type BriefingTask = {
  readonly templateId: string;
  readonly measure: BriefingMeasure;
  readonly target: number;
  readonly progress: number;
  readonly rewardBps: number;
  readonly claim: Claim;
  readonly paidCents: MoneyCents;
};

export type Briefing =
  | { readonly status: 'none' }
  | {
      readonly status: 'active';
      readonly dayKey: string;
      readonly tasks: readonly BriefingTask[];
      readonly bonus: Claim;
      readonly bonusPaidCents: MoneyCents;
    };

type ActiveBriefing = Extract<Briefing, { status: 'active' }>;

export const NO_BRIEFING: Briefing = { status: 'none' };

const MS_PER_MINUTE = 60_000;
const BPS = 10_000n;

function filedReturns(state: GameState): number {
  if (state.tax.status === 'notStarted') return 0;
  return state.tax.returns.filter((filed) => filed.filing.status !== 'unfiled').length;
}

const MEASURES: Readonly<Record<BriefingMeasure, (state: GameState) => number>> = {
  taps: (state) => state.tap.totalAcceptedTaps,
  play_minutes: (state) => Math.floor(state.clock.simulationMs / MS_PER_MINUTE),
  wallet_upgrades: (state) => state.tap.walletLevel,
  improvements: (state) => state.activity.lifetime.byKind.improvement,
  trades: (state) => state.activity.lifetime.byKind.trade,
  tax_returns: filedReturns,
};

const NEEDS: Readonly<Record<BriefingNeed, (state: GameState, rules: BriefingRules) => boolean>> = {
  nothing: () => true,
  wallet_room: (state, rules) => state.tap.walletLevel < rules.walletMaxLevel,
  business: (state) => state.businesses.length > 0,
  trading: (state) => state.tradingUnlocked,
  tax_return: (state) =>
    state.tax.status !== 'notStarted' &&
    state.tax.returns.some((due) => due.filing.status === 'unfiled'),
};

export const isTaskDone = (task: BriefingTask) => task.progress >= task.target;

function shareOfPeak(state: GameState, share: { bps: number; minCents: MoneyCents }): MoneyCents {
  const scaled = (state.peakNetWorthCents * BigInt(share.bps)) / BPS;
  return moneyCents(scaled > share.minCents ? scaled : share.minCents);
}

function drawnTemplates(state: GameState, day: Day): readonly BriefingTemplate[] {
  const order = (template: BriefingTemplate) =>
    hashKey(`${state.saveId}:${day.dayKey}:${template.id}`);
  const fitting = day.rules.templates.filter((template) => NEEDS[template.needs](state, day.rules));
  return Array.from({ length: day.rules.tasksPerDay }).reduce<BriefingTemplate[]>((drawn) => {
    const open = fitting.filter(
      (template) => !drawn.some((taken) => taken.measure === template.measure),
    );
    if (open.length === 0) return drawn;
    return [...drawn, open.reduce((best, next) => (order(next) < order(best) ? next : best))];
  }, []);
}

type Day = { readonly dayKey: string; readonly rules: BriefingRules };

function drawBriefing(state: GameState, day: Day): ActiveBriefing {
  return {
    status: 'active',
    dayKey: day.dayKey,
    tasks: drawnTemplates(state, day).map((template) => ({
      templateId: template.id,
      measure: template.measure,
      target: template.count,
      progress: 0,
      rewardBps: template.rewardBps,
      claim: 'unclaimed',
      paidCents: moneyCents(0),
    })),
    bonus: 'unclaimed',
    bonusPaidCents: moneyCents(0),
  };
}

const isClaimable = (task: BriefingTask) => isTaskDone(task) && task.claim === 'unclaimed';

function bonusDue(briefing: ActiveBriefing): boolean {
  return (
    briefing.bonus === 'unclaimed' && briefing.tasks.length > 0 && briefing.tasks.every(isTaskDone)
  );
}

export type BriefingRewards = {
  readonly taskCents: readonly MoneyCents[];
  readonly bonusCents: MoneyCents;
  readonly claimableCents: MoneyCents;
};

const NO_REWARDS: BriefingRewards = {
  taskCents: [],
  bonusCents: moneyCents(0),
  claimableCents: moneyCents(0),
};

export function briefingRewards(state: GameState, rules: BriefingRules): BriefingRewards {
  const { briefing } = state;
  if (briefing.status === 'none') return NO_REWARDS;
  const taskCents = briefing.tasks.map((task) =>
    task.claim === 'claimed'
      ? task.paidCents
      : shareOfPeak(state, { bps: task.rewardBps, minCents: rules.minRewardCents }),
  );
  const bonusCents =
    briefing.bonus === 'claimed'
      ? briefing.bonusPaidCents
      : shareOfPeak(state, { bps: rules.bonusBps, minCents: rules.minBonusCents });
  const ready = briefing.tasks.reduce(
    (total, task, index) => total + (isClaimable(task) ? taskCents[index]! : 0n),
    0n,
  );
  return {
    taskCents,
    bonusCents,
    claimableCents: moneyCents(ready + (bonusDue(briefing) ? bonusCents : 0n)),
  };
}

function progressed(briefing: Briefing, span: { before: GameState; after: GameState }): Briefing {
  if (briefing.status === 'none') return briefing;
  return {
    ...briefing,
    tasks: briefing.tasks.map((task) => {
      const gained = MEASURES[task.measure](span.after) - MEASURES[task.measure](span.before);
      return { ...task, progress: Math.min(task.target, task.progress + Math.max(0, gained)) };
    }),
  };
}

function isStale(briefing: Briefing, dayKey: string): boolean {
  if (briefing.status === 'none') return true;
  return briefing.dayKey !== dayKey && !briefing.tasks.some(isClaimable) && !bonusDue(briefing);
}

export function withBriefing(
  state: GameState,
  step: Day & { readonly before: GameState; readonly play: 'counted' | 'ignored' },
): GameState {
  const current =
    step.play === 'counted'
      ? progressed(state.briefing, { before: step.before, after: state })
      : state.briefing;
  const briefing = isStale(current, step.dayKey) ? drawBriefing(state, step) : current;
  return briefing === state.briefing ? state : { ...state, briefing };
}

export type ClaimBriefing = { readonly type: 'ClaimBriefing' };

export function applyClaimBriefing(state: GameState, rules: BriefingRules): CommandResult {
  const { briefing } = state;
  const rewards = briefingRewards(state, rules);
  if (briefing.status === 'none' || rewards.claimableCents === 0n)
    return { ok: false, error: 'BRIEFING_NOT_CLAIMABLE' };
  const paid = bonusDue(briefing);
  return {
    ok: true,
    cashChangeCents: rewards.claimableCents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + rewards.claimableCents),
      briefing: {
        ...briefing,
        tasks: briefing.tasks.map((task, index) =>
          isClaimable(task)
            ? { ...task, claim: 'claimed', paidCents: rewards.taskCents[index]! }
            : task,
        ),
        bonus: paid ? 'claimed' : briefing.bonus,
        bonusPaidCents: paid ? rewards.bonusCents : briefing.bonusPaidCents,
      },
    },
  };
}
