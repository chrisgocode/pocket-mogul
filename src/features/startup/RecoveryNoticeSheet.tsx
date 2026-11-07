import { Modal, StyleSheet, View } from 'react-native';

import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

export function RecoveryNoticeSheet() {
  const game = useGame();
  const { notice } = useGameSnapshot();
  if (notice.kind === 'none') return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={game.dismissNotice}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <AppText variant="title" accessibilityRole="header">
            Save restored
          </AppText>
          <AppText muted>
            Your latest save was damaged, so the game opened your most recent backup. Progress from
            the last few minutes may be missing.
          </AppText>
          <Button label="OK" onPress={game.dismissNotice} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
});
