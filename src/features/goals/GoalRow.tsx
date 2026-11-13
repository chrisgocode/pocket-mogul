import { StyleSheet, View } from 'react-native';

import type { GoalView } from '@/application/goalsView';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { GoalBadge } from './GoalBadge';
import { rewardText } from './goalFormat';
import { OpenGoalRow } from './OpenGoalRow';

export function GoalRow({
  goal,
  onPin,
  onClaim,
}: {
  goal: GoalView;
  onPin: (goalId: string | null) => void;
  onClaim: (goalIds: readonly string[]) => void;
}) {
  if (goal.status === 'open') return <OpenGoalRow goal={goal} onPin={onPin} />;
  const reward = rewardText(goal);
  const claimed = goal.status === 'claimed';
  return (
    <View style={styles.reached}>
      <ListRow
        leading={<GoalBadge reached />}
        title={goal.title}
        subtitle={goal.reachedLabel}
        value={claimed ? reward : undefined}
        detail={claimed && reward !== undefined ? 'Claimed' : undefined}
        accessibilityLabel={`${goal.title}, badge earned, ${goal.reachedLabel}`}
      />
      {claimed ? null : (
        <Button
          label={`Claim ${reward ?? ''}`}
          accessibilityLabel={`Claim ${reward ?? ''} for ${goal.title}`}
          onPress={() => onClaim([goal.id])}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ reached: { gap: spacing.sm } });
