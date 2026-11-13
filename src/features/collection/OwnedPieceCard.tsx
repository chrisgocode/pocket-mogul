import { OwnedPieceHeading } from './OwnedPieceHeading';
import type { OwnedPiece } from '@/application/collectionView';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { heldNote } from './collectionFormat';

export function OwnedPieceCard({
  owned,
  onSell,
}: {
  owned: OwnedPiece;
  onSell: (owned: OwnedPiece) => void;
}) {
  const label = `Sell · ${formatCashChange(owned.saleCents)}`;
  return (
    <Card>
      <OwnedPieceHeading owned={owned} />
      <ListRow
        title="Appraised value"
        value={formatMoneyExact(owned.valueCents)}
        detail={heldNote(owned)}
      />
      <Button
        label={label}
        accessibilityLabel={`Sell ${owned.piece.name}, ${label}`}
        variant="secondary"
        onPress={() => onSell(owned)}
      />
    </Card>
  );
}
