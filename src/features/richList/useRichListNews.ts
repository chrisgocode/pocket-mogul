import { useCallback } from 'react';

import { richListNewsText } from '@/application/richListView';
import { getContent } from '@/content';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { useDismissAfter } from '@/ui/effects/useDismissAfter';

const NEWS_MS = 6000;

export function useRichListNews() {
  const game = useGame();
  const { richList, returnSummary } = useGameSnapshot().state;
  const news = richList.status === 'active' ? richList.news : undefined;
  const waiting = returnSummary.status === 'pending';
  const message = news === undefined || waiting ? undefined : richListNewsText(news, getContent());
  const dismiss = useCallback(
    () =>
      void game.dispatch({ id: game.createCommandId(), command: { type: 'DismissRichListNews' } }),
    [game],
  );
  useDismissAfter(message, { ms: NEWS_MS, dismiss });
  return { message, dismiss };
}
