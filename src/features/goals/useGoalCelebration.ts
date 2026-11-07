import { useCallback } from 'react';

import type { GameEvent } from '@/application/game';
import { goalTitles } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGame } from '@/features/game/GameContext';
import { useDismissAfter } from '@/ui/effects/useDismissAfter';
import { useSubscription } from '@/ui/effects/useSubscription';
import { useNotice } from '@/ui/state/useNotice';

const CELEBRATION_MS = 4000;

export function useGoalCelebration() {
  const game = useGame();
  const { notice, show, dismiss } = useNotice<readonly string[]>();
  const onEvent = useCallback(
    (event: GameEvent) => show(goalTitles(getContent(), event.goalIds)),
    [show],
  );
  useSubscription(game.subscribeEvents, onEvent);
  useDismissAfter(notice, { ms: CELEBRATION_MS, dismiss });
  return { titles: notice, dismiss };
}
