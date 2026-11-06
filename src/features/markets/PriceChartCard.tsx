import type { ChartRange } from '@/application/priceChart';
import { Card } from '@/ui/Card';
import { SegmentedControl, type SegmentOption } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';

import type { ListedAsset } from './AssetOverview';
import { PriceChartBody } from './PriceChartBody';

const RANGE_OPTIONS: readonly SegmentOption<ChartRange>[] = [
  { value: '1h', label: '1 hour' },
  { value: '8h', label: '8 hours' },
  { value: '30d', label: '30 days' },
];

export function PriceChartCard({ detail }: { detail: ListedAsset }) {
  const range = useSegment<ChartRange>('1h');
  return (
    <Card>
      <SegmentedControl options={RANGE_OPTIONS} selected={range.selected} onSelect={range.select} />
      <PriceChartBody detail={detail} range={range.selected} />
    </Card>
  );
}
