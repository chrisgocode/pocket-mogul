import { selectTapBoost } from '@/application/tapBoostView';
import { getContent } from '@/content';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { tapBoostText } from './tapBoostText';

export function TapBoostCard() {
  const game = useGame();
  const view = selectTapBoost(useGameSnapshot(), getContent());
  const text = tapBoostText(view);
  return (
    <Card>
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
    </Card>
  );
}
