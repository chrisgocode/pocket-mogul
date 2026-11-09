import { StyleSheet, View } from 'react-native';

import { selectTapBoost } from '@/application/tapBoostView';
import { getContent } from '@/content';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { colors, spacing } from '@/ui/tokens';
import { AppText } from '@/ui/Typography';

import { tapBoostText } from './tapBoostText';

export function TapBoostControl() {
  const game = useGame();
  const view = selectTapBoost(useGameSnapshot(), getContent());
  const text = tapBoostText(view);
  return (
    <View style={styles.control}>
      <AppText variant="heading" accessibilityRole="header">
        {text.title}
      </AppText>
      <AppText muted>{text.detail}</AppText>
      <Button
        label={text.buttonLabel}
        accessibilityLabel={`Tap Boost, ${text.buttonLabel}`}
        variant={view.status === 'unavailable' ? 'secondary' : 'primary'}
        onPress={() => void game.pressTapBoost()}
        disabled={!text.enabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
