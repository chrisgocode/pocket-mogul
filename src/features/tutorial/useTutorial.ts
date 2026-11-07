import { selectTutorial, type TutorialView } from '@/application/tutorialView';
import type { TutorialStep } from '@/domain/tutorial';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';

export function useTutorial(): {
  view: TutorialView;
  isOn: (step: TutorialStep) => boolean;
  skip: () => void;
} {
  const game = useGame();
  const view = selectTutorial(useGameSnapshot());
  return {
    view,
    isOn: (step) => view.status === 'showing' && view.step === step,
    skip: () =>
      void game.dispatch({ id: game.createCommandId(), command: { type: 'SkipTutorial' } }),
  };
}
