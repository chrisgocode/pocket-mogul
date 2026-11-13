import type { CollectionView, OwnedPiece } from '@/application/collectionView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

import { piecesNote } from './collectionFormat';
import { OwnedPieceCard } from './OwnedPieceCard';

const EMPTY_NOTE =
  'Nothing yet. Buy a lot from the auction house: art, cars, watches, yachts, wine and curiosities all count in your net worth.';

export function PiecesSection({
  view,
  onSell,
  onShow,
}: {
  view: CollectionView;
  onSell: (owned: OwnedPiece) => void;
  onShow: (pieceId: string | null) => void;
}) {
  return (
    <Section title="Your pieces" note={piecesNote(view)}>
      {view.pieces.length === 0 ? (
        <Card>
          <AppText muted>{EMPTY_NOTE}</AppText>
        </Card>
      ) : null}
      {view.pieces.map((owned) => (
        <OwnedPieceCard key={owned.piece.id} owned={owned} onSell={onSell} onShow={onShow} />
      ))}
    </Section>
  );
}
