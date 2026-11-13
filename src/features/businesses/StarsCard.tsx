import type { StarsView } from '@/application/hotelView';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

function housekeepingNote(stars: StarsView): string {
  const staffed = `${stars.housekeepers} of ${stars.housekeepersNeeded} housekeepers`;
  return stars.housekeepers >= stars.housekeepersNeeded
    ? `${staffed}: housekeeping star earned`
    : `${staffed}: hire more in Staff for a star`;
}

export function StarsCard({ stars }: { stars: StarsView }) {
  return (
    <Card>
      <ListRow
        title={`${stars.rating} of ${stars.max} stars`}
        subtitle={`${housekeepingNote(stars)} · One more star every ${stars.qualityPerStar} Quality levels`}
        value={`${stars.pricePercent}% price`}
      />
    </Card>
  );
}
