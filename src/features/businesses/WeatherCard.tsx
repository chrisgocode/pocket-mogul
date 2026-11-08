import type { WeatherDay } from '@/application/carWashView';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { WEATHER_NAMES } from './carWashFormat';

const dayText = (day: WeatherDay) => `${WEATHER_NAMES[day.weather]} · ${day.walkInPercent}%`;

const dayLabel = (index: number) => (index === 0 ? 'Tomorrow' : `In ${index + 1} days`);

export function WeatherCard({
  today,
  forecast,
}: {
  today: WeatherDay;
  forecast: readonly WeatherDay[];
}) {
  return (
    <Card>
      <ListRow
        title={`Today: ${WEATHER_NAMES[today.weather]}`}
        subtitle="Weather moves walk-in customers"
        value={`${today.walkInPercent}% walk-ins`}
      />
      {forecast.map((day, index) => (
        <DetailLine key={dayLabel(index)} label={dayLabel(index)} value={dayText(day)} />
      ))}
    </Card>
  );
}
