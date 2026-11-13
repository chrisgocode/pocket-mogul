import type { AvailableConference, ConferenceOption } from '@/application/hotelView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'Hosts conventions, bringing more guests in every Event season';

export function ConferenceCard({
  conference,
  onReview,
}: {
  conference: ConferenceOption;
  onReview: (conference: AvailableConference) => void;
}) {
  if (conference.status === 'locked') {
    const value = `Unlocks at ${stageName(conference.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Conference centre" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (conference.status === 'installed') {
    return (
      <Card>
        <ListRow title="Conference centre" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Conference centre" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add a conference centre', conference)}
        onPress={() => onReview(conference)}
        disabled={!conference.affordable}
      />
    </Card>
  );
}
