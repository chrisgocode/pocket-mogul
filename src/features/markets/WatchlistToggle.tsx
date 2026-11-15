import { useGame } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';

export function WatchlistToggle({ assetId, watched }: { assetId: string; watched: boolean }) {
  const game = useGame();
  const toggle = () =>
    void game.dispatch({
      id: game.createCommandId(),
      command: { type: 'SetWatchlist', assetId, watched: !watched },
    });
  return (
    <Button
      size="compact"
      label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      variant="secondary"
      onPress={toggle}
    />
  );
}
