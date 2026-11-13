import { StyleSheet, View } from 'react-native';

import { selectBriefing } from '@/application/briefingView';
import { formatMoneyCompact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { BriefingTaskRow } from './BriefingTaskRow';
import { briefingBonusText } from './briefingText';
import { useClaimBriefing } from './useClaimBriefing';

export function BriefingCard() {
  const briefing = selectBriefing(useGameSnapshot().state);
  const claim = useClaimBriefing();
  if (briefing.status === 'hidden') return null;
  const progress = `${briefing.doneCount} of ${briefing.tasks.length} done`;
  const reward = formatMoneyCompact(briefing.claimableCents);
  return (
    <Card accessibilityLabel={`Daily briefing, ${progress}`}>
      <View style={styles.heading}>
        <AppText variant="heading">Daily briefing</AppText>
        <AppText variant="caption">{progress}</AppText>
      </View>
      {briefing.tasks.map((task) => (
        <BriefingTaskRow key={task.id} task={task} />
      ))}
      <AppText variant="caption">{briefingBonusText(briefing)}</AppText>
      {briefing.claimableCents > 0n ? (
        <Button
          label={`Claim ${reward}`}
          accessibilityLabel={`Claim ${reward} from the daily briefing`}
          onPress={claim}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
