import type { SeasonRateView } from '@/application/hotelView';
import { PRICE_LEVELS } from '@/domain/business/definition';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { AppText } from '@/ui/Typography';

import { PRICE_LEVEL_NAMES } from './businessFormat';
import { SEASON_NAMES, type HotelActions } from './hotelFormat';

const LEVELS = PRICE_LEVELS.map((level) => ({ value: level, label: PRICE_LEVEL_NAMES[level] }));

const rateNote = (rate: SeasonRateView) =>
  rate.current ? `${rate.guestsPercent}% guests · In season now` : `${rate.guestsPercent}% guests`;

export function RatePlanCard({
  rates,
  managerHired,
  onSelect,
}: {
  rates: readonly SeasonRateView[];
  managerHired: boolean;
  onSelect: HotelActions['setSeasonRate'];
}) {
  const note = managerHired
    ? 'Each season opens at its planned rate, then your manager sets the best rate daily'
    : 'The hotel switches to the planned rate when a season starts';
  return (
    <Card>
      <AppText variant="heading">Rate plan</AppText>
      <AppText variant="caption" muted>
        {note}
      </AppText>
      {rates.map((rate) => (
        <ChoiceRow
          key={rate.season}
          title={SEASON_NAMES[rate.season]}
          note={rateNote(rate)}
          choices={LEVELS}
          selected={rate.priceLevel}
          onSelect={(priceLevel) => onSelect({ season: rate.season, priceLevel })}
        />
      ))}
    </Card>
  );
}
