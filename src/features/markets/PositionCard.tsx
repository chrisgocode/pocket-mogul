import type { PositionView } from '@/application/positionView';
import { formatMoneyExact, formatPrice, formatQuantity } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

import type { TradeUnits } from './tradeUnits';

export function PositionCard({ position, units }: { position: PositionView; units: TradeUnits }) {
  const { averageCost } = position;
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Your position
      </AppText>
      <DetailLine label={units.title} value={formatQuantity(position.quantity)} />
      {averageCost === undefined ? null : (
        <DetailLine label="Average cost" value={formatPrice(averageCost)} />
      )}
      <DetailLine label="Current value" value={formatMoneyExact(position.valueCents)} emphasis />
      <DetailLine label="Unrealized result" value={formatCashChange(position.unrealizedCents)} />
      <DetailLine label="Realized result" value={formatCashChange(position.realizedProfitCents)} />
    </Card>
  );
}
