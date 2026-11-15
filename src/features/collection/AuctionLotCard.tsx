import { CollectibleArtwork } from './CollectibleArtwork';
import type { AuctionLot } from '@/application/collectionView';
import { formatMoneyExact } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';

import { lotActionLabel, lotKind } from './collectionFormat';

export function AuctionLotCard({
  lot,
  onBuy,
}: {
  lot: AuctionLot;
  onBuy: (lot: AuctionLot) => void;
}) {
  const format = useMoneyFormat();
  const exactPrice = formatMoneyExact(lot.priceCents);
  return (
    <Card>
      <CollectibleArtwork pieceId={lot.piece.id} categoryName={lot.categoryName} />
      <ListRow
        title={lot.piece.name}
        subtitle={lotKind(lot)}
        value={format.short(lot.priceCents)}
        accessibilityLabel={[lot.piece.name, lotKind(lot), exactPrice].join(', ')}
      />
      <AppText variant="caption" muted>
        {`${lot.piece.note} · ${lot.valueNote}`}
      </AppText>
      <Button
        label={lotActionLabel(lot, format.short)}
        accessibilityLabel={`${lot.piece.name}, ${lotActionLabel(lot)}`}
        disabled={lot.status === 'owned' || !lot.affordable}
        onPress={() => onBuy(lot)}
      />
    </Card>
  );
}
