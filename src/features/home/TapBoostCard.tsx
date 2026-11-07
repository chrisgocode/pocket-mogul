import type { TapBoostView } from '@/application/tapBoostView';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { tapBoostText } from './tapBoostText';

export function TapBoostCard({ view, onPress }: { view: TapBoostView; onPress: () => void }) {
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
        onPress={onPress}
        disabled={!text.enabled}
      />
    </Card>
  );
}
