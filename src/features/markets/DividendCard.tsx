import type { DividendView } from '@/application/dividendView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

import { payoutTiming } from './marketFormat';

export function DividendCard({ dividends }: { dividends: DividendView }) {
  const perHour = dividends.holdingPerHourCents;
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Dividends
      </AppText>
      {perHour === undefined ? null : (
        <DetailLine
          label="Estimated dividends"
          value={`${formatMoneyExact(perHour)} an hour`}
          emphasis
        />
      )}
      <DetailLine label="Pending dividends" value={formatMoneyExact(dividends.pendingCents)} />
      <DetailLine label="Next payout" value={payoutTiming(dividends.nextPayoutInMs)} />
      <AppText variant="caption" muted>
        Paid into cash at each market hour. Shares earn only for the time you hold them.
      </AppText>
    </Card>
  );
}
