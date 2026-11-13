import type { ComingSeason } from '@/domain/business/hotelSeasons';
import type { Season } from '@/domain/business/hotelRules';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { inDaysText, SEASON_NAMES } from './hotelFormat';

export function SeasonCard({
  season,
  guestsPercent,
  forecast,
}: {
  season: Season;
  guestsPercent: number;
  forecast: readonly ComingSeason[];
}) {
  return (
    <Card>
      <ListRow
        title={`Now: ${SEASON_NAMES[season]}`}
        subtitle="Seasons move how many guests want a room"
        value={`${guestsPercent}% guests`}
      />
      {forecast.map((coming) => (
        <DetailLine
          key={coming.inDays}
          label={`Next, ${inDaysText(coming.inDays)}`}
          value={SEASON_NAMES[coming.season]}
        />
      ))}
    </Card>
  );
}
