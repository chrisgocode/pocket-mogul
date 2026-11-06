import { selectReturnSummary } from '@/application/returnSummaryView';
import { getContent } from '@/content';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';

export function useReturnSummary() {
  const game = useGame();
  const { state } = useGameSnapshot();
  const dismiss = () =>
    void game.dispatch({
      id: game.createCommandId(),
      command: { type: 'AcknowledgeReturnSummary' },
    });
  return { summary: selectReturnSummary(state, getContent()), dismiss };
}
