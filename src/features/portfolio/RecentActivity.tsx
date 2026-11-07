import { useRouter } from 'expo-router';

import { activityRow } from '@/application/activityView';
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
  const recent = read.entries.slice(0, RECENT_ENTRIES);
  return (
    <Card>
      {recent.length === 0 ? (
        <AppText muted>Purchases, sales, upgrades, trades and dividends will appear here.</AppText>
      ) : (
        recent.map((entry) => (
          <ActivityRowView key={entry.sequence} row={activityRow(entry, content)} />
        ))
      )}
      <Button
        label="See all activity"
        variant="secondary"
        onPress={() => router.push('/portfolio/activity')}
      />
    </Card>
  );
}
