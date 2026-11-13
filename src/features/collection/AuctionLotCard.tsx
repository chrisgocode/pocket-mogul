import { CollectibleArtwork } from './CollectibleArtwork';
import type { AuctionLot } from '@/application/collectionView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';

import { lotActionLabel, pieceKind } from './collectionFormat';

export function AuctionLotCard({
  lot,
  onBuy,
}: {
  lot: AuctionLot;
  onBuy: (lot: AuctionLot) => void;
}) {
  const label = lotActionLabel(lot);
  return (
    <Card>
      <CollectibleArtwork pieceId={lot.piece.id} categoryName={lot.categoryName} />
      <ListRow
        title={lot.piece.name}
        subtitle={pieceKind(lot)}
        value={formatMoneyExact(lot.priceCents)}
      />
      <AppText variant="caption" muted>
        {`${lot.piece.note} · ${lot.valueNote}`}
      </AppText>
      <Button
        label={label}
        accessibilityLabel={`${lot.piece.name}, ${label}`}
        disabled={lot.status === 'owned' || !lot.affordable}
        onPress={() => onBuy(lot)}
      />
    </Card>
  );
}
