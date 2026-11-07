import { View } from 'react-native';

import type { TutorialStep } from '@/domain/tutorial';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { TUTORIAL_COPY } from './tutorialCopy';
import { useTutorial } from './useTutorial';

export function TutorialHint({ steps }: { steps: readonly TutorialStep[] }) {
  const { view, skip } = useTutorial();
  if (view.status === 'finished' || !steps.includes(view.step)) return null;
  const copy = TUTORIAL_COPY[view.step];
  const progress = `Step ${view.number} of ${view.total}`;
  return (
    <Card highlighted>
      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`Tutorial, ${progress.toLowerCase()}, ${copy.title}. ${copy.message}`}
        accessibilityLiveRegion="polite"
      >
        <AppText variant="caption" muted>
          {progress}
        </AppText>
        <AppText variant="heading">{copy.title}</AppText>
        <AppText muted>{copy.message}</AppText>
      </View>
      <Button label="Skip tutorial" variant="secondary" onPress={skip} />
    </Card>
  );
}
