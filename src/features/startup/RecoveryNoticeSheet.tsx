import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { AppText } from '@/ui/Typography';

export function RecoveryNoticeSheet() {
  const game = useGame();
  const { notice } = useGameSnapshot();
  if (notice.kind === 'none') return null;
  return (
    <BottomSheet visible onRequestClose={game.dismissNotice}>
      <AppText variant="title" accessibilityRole="header">
        Save restored
      </AppText>
      <AppText muted>
        Your latest save was damaged, so the game opened your most recent backup. Progress from the
        last few minutes may be missing.
      </AppText>
      <Button label="OK" onPress={game.dismissNotice} />
    </BottomSheet>
  );
}
