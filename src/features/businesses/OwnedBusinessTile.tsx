import type { BusinessOffer } from '@/application/businessesView';
import { selectBusinessTile, type BusinessTileView } from '@/application/businessTileView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { BusinessArt } from '@/ui/BusinessArt';
import { Pips } from '@/ui/Pips';
import { Tile, type TileBadge } from '@/ui/Tile';
import { AppText } from '@/ui/Typography';
import { colors } from '@/ui/tokens';

import { formatPerDay, STAGE_COUNT } from './businessFormat';

const BADGES: Record<BusinessTileView['notice'], TileBadge | undefined> = {
  none: undefined,
  upgrade: { tone: 'gain', icon: 'upgrade' },
  closed: { tone: 'alert', icon: 'warning' },
};

export function OwnedBusinessTile({
  offer,
  onManage,
}: {
  offer: BusinessOffer;
  onManage: (offer: BusinessOffer) => void;
}) {
  const { business } = offer;
  const format = useMoneyFormat();
  const tile = selectBusinessTile(useGameSnapshot(), {
    businessId: business.id,
    content: getContent(),
  });
  const closed = offer.operation === 'closed';
  const spoken = closed
    ? 'Closed · deposit to reopen'
    : `Profit ${formatPerDay(offer.profitPerDayCents)}`;
  return (
    <Tile
      accessibilityLabel={`${business.name}, ${spoken}, Manage →`}
      onPress={() => onManage(offer)}
      badge={BADGES[tile.notice]}
    >
      <BusinessArt id={business.id} />
      <AppText variant="heading" numberOfLines={1}>
        {business.name}
      </AppText>
      <Pips total={STAGE_COUNT} filled={tile.stage} />
      <AppText variant="number" style={{ color: closed ? colors.loss : colors.gain }}>
        {closed ? 'Closed' : `${format.shortGain(offer.profitPerDayCents)}/d`}
      </AppText>
    </Tile>
  );
}
