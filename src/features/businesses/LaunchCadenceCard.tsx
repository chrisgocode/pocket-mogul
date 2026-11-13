import type { CadenceView } from '@/application/spaceView';
import type { Cadence, LaunchWeather } from '@/domain/business/spaceRules';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { CADENCE_NAMES, LAUNCH_WEATHER_NAMES } from './spaceFormat';

const cadenceChoice = (option: CadenceView) => ({
  value: option.cadence,
  label: option.best ? `${CADENCE_NAMES[option.cadence]} ★` : CADENCE_NAMES[option.cadence],
});

const cadenceFacts = (option: CadenceView) =>
  `${option.launchesPercent}% launches today · ${formatMoneyExact(option.profitCents)}/day`;

const forecastText = (forecast: readonly LaunchWeather[]) =>
  forecast.map((weather) => LAUNCH_WEATHER_NAMES[weather]).join(', then ');

const cadenceNote = (managerHired: boolean) =>
  managerHired
    ? 'Your manager sets the best cadence for each day’s weather'
    : 'A faster cadence launches more and loses more to weather';

export function LaunchCadenceCard({
  weather,
  forecast,
  cadence,
  cadences,
  managerHired,
  onSelect,
}: {
  weather: LaunchWeather;
  forecast: readonly LaunchWeather[];
  cadence: Cadence;
  cadences: readonly CadenceView[];
  managerHired: boolean;
  onSelect: (cadence: Cadence) => void;
}) {
  return (
    <Card>
      <ListRow
        title={`Weather today: ${LAUNCH_WEATHER_NAMES[weather]}`}
        subtitle={`Next: ${forecastText(forecast)}`}
      />
      <ChoiceRow
        title="Launch cadence"
        note={cadenceNote(managerHired)}
        choices={cadences.map(cadenceChoice)}
        selected={cadence}
        onSelect={onSelect}
      />
      {cadences.map((option) => (
        <DetailLine
          key={option.cadence}
          label={CADENCE_NAMES[option.cadence]}
          value={cadenceFacts(option)}
        />
      ))}
    </Card>
  );
}
