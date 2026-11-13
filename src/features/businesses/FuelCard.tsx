import type { FuelDayView } from '@/application/airlineView';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { FUEL_NAMES } from './airlineFormat';

const dayLabel = (index: number) => (index === 0 ? 'Tomorrow' : `In ${index + 1} days`);

const dayText = (day: FuelDayView) => `${FUEL_NAMES[day.fuel]} · ${day.costPercent}%`;

export function FuelCard({
  today,
  forecast,
}: {
  today: FuelDayView;
  forecast: readonly FuelDayView[];
}) {
  return (
    <Card>
      <ListRow
        title={`Fuel today: ${FUEL_NAMES[today.fuel]}`}
        subtitle="Fuel moves the cost of every seat, most on long routes"
        value={`${today.costPercent}% cost`}
      />
      {forecast.map((day, index) => (
        <DetailLine key={dayLabel(index)} label={dayLabel(index)} value={dayText(day)} />
      ))}
    </Card>
  );
}
