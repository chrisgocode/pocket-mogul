import { Button } from '@/ui/Button';

export function WatchlistToggle({
  watched,
  onWatch,
}: {
  watched: boolean;
  onWatch: (watched: boolean) => void;
}) {
  return (
    <Button
      label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      variant="secondary"
      onPress={() => onWatch(!watched)}
    />
  );
}
