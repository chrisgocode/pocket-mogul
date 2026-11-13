import { selectCollection } from '@/application/collectionView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { StatPair } from '@/ui/StatPair';
import { AppText } from '@/ui/Typography';

import { AuctionLotCard } from './AuctionLotCard';
import { collectionActionCommand, collectionActionSheetText } from './collectionAction';
import { auctionNote, piecesNote } from './collectionFormat';
import { OwnedPieceCard } from './OwnedPieceCard';

const EMPTY_NOTE =
  'Nothing yet. Buy a lot from the auction house: art, cars, watches, yachts, wine and curiosities all count in your net worth.';

export function CollectionScreen() {
  const view = selectCollection(useGameSnapshot(), getContent());
  const format = useMoneyFormat();
  const { confirmation, review, close, confirm } = useGameAction(collectionActionCommand);
  const { saleReturnPercent } = view;
  return (
    <Screen tone="profile">
      <StatPair
        left={{ label: 'Collection value', value: format.money(view.valueCents) }}
        right={{ label: 'Pieces', value: `${view.pieces.length} of ${view.pieceCount}` }}
      />
      <Section title="Auction house" note={auctionNote(view)}>
        {view.lots.map((lot) => (
          <AuctionLotCard key={lot.piece.id} lot={lot} onBuy={() => review({ kind: 'buy', lot })} />
        ))}
      </Section>
      <Section title="Your pieces" note={piecesNote(view)}>
        {view.pieces.length === 0 ? (
          <Card>
            <AppText muted>{EMPTY_NOTE}</AppText>
          </Card>
        ) : null}
        {view.pieces.map((owned) => (
          <OwnedPieceCard
            key={owned.piece.id}
            owned={owned}
            onSell={() => review({ kind: 'sell', owned, saleReturnPercent })}
          />
        ))}
      </Section>
      <ActionSheet
        confirmation={confirmation}
        taxCommand={collectionActionCommand}
        describe={collectionActionSheetText}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
