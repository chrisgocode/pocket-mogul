import { StyleSheet, View } from 'react-native';

import type { GoalView } from '@/application/goalsView';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { spacing } from '@/ui/tokens';

import { GoalBadge } from './GoalBadge';
import { rewardText } from './goalFormat';

export function OpenGoalRow({
  goal,
  onPin,
}: {
  goal: Extract<GoalView, { status: 'open' }>;
  onPin: (goalId: string | null) => void;
}) {
  const reward = rewardText(goal);
  return (
    <View style={styles.open}>
      <ListRow
        leading={<GoalBadge reached={false} />}
        title={goal.title}
        subtitle={goal.progressLabel}
        value={reward}
        detail={reward === undefined ? undefined : 'Reward'}
        accessibilityLabel={`${goal.title}, not reached, ${goal.progressLabel}`}
      />
      <Button
        label={goal.pinned ? 'Unpin from Earn' : 'Pin to Earn'}
        accessibilityLabel={`${goal.pinned ? 'Unpin' : 'Pin'} ${goal.title}`}
        variant="secondary"
        onPress={() => onPin(goal.pinned ? null : goal.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ open: { gap: spacing.sm } });
