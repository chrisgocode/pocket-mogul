import {
  claimableBriefingCents,
  isTaskDone,
  type BriefingMeasure,
  type BriefingTask,
} from '@/domain/briefing';
import type { GameState } from '@/domain/gameState';
import type { MoneyCents } from '@/domain/money';

export type BriefingTaskView = {
  readonly id: string;
  readonly title: string;
  readonly progressLabel: string;
  readonly rewardCents: MoneyCents;
  readonly status: 'open' | 'claimable' | 'claimed';
};

export type BriefingView =
  | { readonly status: 'hidden' }
  | {
      readonly status: 'shown';
      readonly tasks: readonly BriefingTaskView[];
      readonly doneCount: number;
      readonly bonusCents: MoneyCents;
      readonly bonus: 'locked' | 'claimable' | 'claimed';
      readonly claimableCents: MoneyCents;
    };

type Wording = { readonly once: string; readonly many: (count: string) => string };

const WORDING: Readonly<Record<BriefingMeasure, Wording>> = {
  taps: { once: 'Tap once', many: (count) => `Tap ${count} times` },
  play_minutes: { once: 'Play for a minute', many: (count) => `Play for ${count} minutes` },
  wallet_upgrades: {
    once: 'Upgrade your wallet',
    many: (count) => `Upgrade your wallet ${count} times`,
  },
  improvements: {
    once: 'Improve a business',
    many: (count) => `Improve your businesses ${count} times`,
  },
  trades: { once: 'Make a trade', many: (count) => `Make ${count} trades` },
  tax_returns: { once: 'File a tax return', many: (count) => `File ${count} tax returns` },
};

const counted = (value: number) => value.toLocaleString('en-US');

function taskTitle(task: BriefingTask): string {
  const wording = WORDING[task.measure];
  return task.target === 1 ? wording.once : wording.many(counted(task.target));
}

function taskStatus(task: BriefingTask): BriefingTaskView['status'] {
  if (!isTaskDone(task)) return 'open';
  return task.claim === 'claimed' ? 'claimed' : 'claimable';
}

function taskView(task: BriefingTask): BriefingTaskView {
  return {
    id: task.templateId,
    title: taskTitle(task),
    progressLabel: `${counted(task.progress)} of ${counted(task.target)}`,
    rewardCents: task.rewardCents,
    status: taskStatus(task),
  };
}

export function selectBriefing(state: GameState): BriefingView {
  const { briefing } = state;
  if (briefing.status === 'none' || briefing.tasks.length === 0) return { status: 'hidden' };
  const tasks = briefing.tasks.map(taskView);
  const doneCount = tasks.filter((task) => task.status !== 'open').length;
  const finished = doneCount === tasks.length;
  const earned = briefing.bonus === 'claimed' ? 'claimed' : 'claimable';
  return {
    status: 'shown',
    tasks,
    doneCount,
    bonusCents: briefing.bonusCents,
    bonus: finished ? earned : 'locked',
    claimableCents: claimableBriefingCents(briefing),
  };
}
