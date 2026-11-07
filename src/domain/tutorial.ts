import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { moneyCents } from './money';

export const TUTORIAL_STEPS = ['tap', 'upgradeWallet', 'buyBusiness'] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export type TutorialProgress = {
  readonly completedSteps: readonly TutorialStep[];
  readonly explanations: 'shown' | 'skipped';
};

type ProgressSource = Pick<GameState, 'tap' | 'businesses'>;

const STEP_DONE: Readonly<Record<TutorialStep, (state: ProgressSource) => boolean>> = {
  tap: (state) => state.tap.totalAcceptedTaps > 0,
  upgradeWallet: (state) => state.tap.walletLevel > 0,
  buyBusiness: (state) => state.businesses.length > 0,
};

export const freshTutorial = (): TutorialProgress => ({
  completedSteps: [],
  explanations: 'shown',
});

export function observedTutorial(
  tutorial: TutorialProgress,
  state: ProgressSource,
): TutorialProgress {
  const completedSteps = TUTORIAL_STEPS.filter(
    (step) => tutorial.completedSteps.includes(step) || STEP_DONE[step](state),
  );
  if (completedSteps.length === tutorial.completedSteps.length) return tutorial;
  return { ...tutorial, completedSteps };
}

export function withTutorialProgress(state: GameState): GameState {
  const tutorial = observedTutorial(state.tutorial, state);
  return tutorial === state.tutorial ? state : { ...state, tutorial };
}

export function newTutorialSteps(
  before: TutorialProgress,
  after: TutorialProgress,
): readonly TutorialStep[] {
  return after.completedSteps.filter((step) => !before.completedSteps.includes(step));
}

export function nextTutorialStep(tutorial: TutorialProgress): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((step) => !tutorial.completedSteps.includes(step));
}

export function isTutorialFinished(tutorial: TutorialProgress): boolean {
  return tutorial.explanations === 'skipped' || nextTutorialStep(tutorial) === undefined;
}

export function applySkipTutorial(state: GameState): CommandResult {
  return {
    ok: true,
    state: { ...state, tutorial: { ...state.tutorial, explanations: 'skipped' } },
    cashChangeCents: moneyCents(0),
  };
}
