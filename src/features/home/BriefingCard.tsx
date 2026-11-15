import { StyleSheet, View } from 'react-native';

import { selectBriefing } from '@/application/briefingView';
import { getContent } from '@/content';
import { formatMoneyCompact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ProgressBar } from '@/ui/ProgressBar';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

import { BriefingTaskRow } from './BriefingTaskRow';
import { briefingBonusText } from './briefingText';
import { useClaimBriefing } from './useClaimBriefing';

export function BriefingCard() {
  const briefing = selectBriefing(useGameSnapshot().state, getContent());
  const claim = useClaimBriefing();
  if (briefing.status === 'hidden')
    return <EmptyState title="No tasks yet" message="New tasks arrive every day." />;
  const progress = `${briefing.doneCount} of ${briefing.tasks.length} done`;
  const reward = formatMoneyCompact(briefing.claimableCents);
  return (
    <View style={styles.briefing} accessibilityLabel={`Daily briefing, ${progress}`}>
      <View style={styles.heading}>
        <AppText variant="title">Daily briefing</AppText>
        <AppText variant="caption" muted>
          {progress}
        </AppText>
      </View>
      <ProgressBar fraction={briefing.doneCount / briefing.tasks.length} />
      {briefing.tasks.map((task) => (
        <BriefingTaskRow key={task.id} task={task} />
      ))}
      <AppText variant="caption" muted>
        {briefingBonusText(briefing)}
      </AppText>
      {briefing.claimableCents > 0n ? (
        <Button
          label={`Claim ${reward}`}
          accessibilityLabel={`Claim ${reward} from the daily briefing`}
          onPress={claim}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  briefing: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
