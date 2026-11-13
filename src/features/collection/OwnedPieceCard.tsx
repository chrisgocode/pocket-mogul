import type { OwnedPiece } from '@/application/collectionView';
import { formatMoneyExact } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';

import { heldNote, pieceKind } from './collectionFormat';

export function OwnedPieceCard({
  owned,
  onSell,
  onShow,
}: {
  owned: OwnedPiece;
  onSell: (owned: OwnedPiece) => void;
  onShow: (pieceId: string | null) => void;
}) {
  const shown = owned.display === 'on_show';
  const label = `Sell · ${formatCashChange(owned.saleCents)}`;
  return (
    <Card>
      <ListRow
        title={owned.piece.name}
        subtitle={pieceKind(owned)}
        value={formatMoneyExact(owned.valueCents)}
      />
      <AppText variant="caption" muted>
        {`${owned.piece.note} · ${heldNote(owned)}`}
      </AppText>
      <Button
        label={shown ? 'On show · take down' : 'Put on show'}
        accessibilityLabel={
          shown ? `Take ${owned.piece.name} off show` : `Put ${owned.piece.name} on show`
        }
        variant="secondary"
        onPress={() => onShow(shown ? null : owned.piece.id)}
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
