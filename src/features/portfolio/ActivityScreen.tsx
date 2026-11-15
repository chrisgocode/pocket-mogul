import { Stack } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { activityRows } from '@/application/activityRows';
import { getContent } from '@/content';
import { AppText } from '@/ui/Typography';
import { colors, spacing } from '@/ui/tokens';

import { ActivityRowView } from './ActivityRowView';
import { LifetimeTotals } from './LifetimeTotals';
import { useActivity } from './useActivity';

export function ActivityScreen() {
  const read = useActivity();
  const content = getContent();
  const rows = read.status === 'loaded' ? activityRows(read.entries, content) : [];
  return (
    <>
      <Stack.Screen options={{ title: 'Activity' }} />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(row) => row.key}
        ListHeaderComponent={LifetimeTotals}
        renderItem={({ item }) => <ActivityRowView row={item} />}
        ListEmptyComponent={
          <AppText muted>
            {read.status === 'failed' ? "Activity history couldn't be loaded." : 'No activity yet.'}
          </AppText>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
});
