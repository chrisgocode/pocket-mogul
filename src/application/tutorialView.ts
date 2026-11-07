import {
  TUTORIAL_STEPS,
  isTutorialFinished,
  nextTutorialStep,
  type TutorialStep,
} from '@/domain/tutorial';

import type { GameSnapshot } from './game';

export type TutorialView =
  | {
      readonly status: 'showing';
      readonly step: TutorialStep;
      readonly number: number;
      readonly total: number;
    }
  | { readonly status: 'finished' };

export function selectTutorial(snapshot: GameSnapshot): TutorialView {
  const { tutorial } = snapshot.state;
  const step = nextTutorialStep(tutorial);
  if (step === undefined || isTutorialFinished(tutorial)) return { status: 'finished' };
  return {
    status: 'showing',
    step,
    number: TUTORIAL_STEPS.indexOf(step) + 1,
    total: TUTORIAL_STEPS.length,
  };
}
