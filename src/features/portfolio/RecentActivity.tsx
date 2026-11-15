import { useRouter } from 'expo-router';

import { activityRows } from '@/application/activityRows';
import { getContent } from '@/content';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

import { ActivityRowView } from './ActivityRowView';
import { useActivity } from './useActivity';

const RECENT_ENTRIES = 5;

export function RecentActivity() {
  const read = useActivity();
  const router = useRouter();
  if (read.status === 'failed') {
    return <AppText muted>Activity history couldn't be loaded.</AppText>;
  }
  if (read.status !== 'loaded') return null;
  const content = getContent();
  const recent = activityRows(read.entries, content).slice(0, RECENT_ENTRIES);
  return (
    <Card>
      {recent.length === 0 ? (
        <AppText muted>Purchases, sales, upgrades, trades and dividends will appear here.</AppText>
      ) : (
        recent.map((row) => <ActivityRowView key={row.key} row={row} />)
      )}
      <Button
        label="See all activity"
        variant="secondary"
        onPress={() => router.push('/portfolio/activity')}
      />
    </Card>
  );
}
