import { selectCollection } from '@/application/collectionView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { StatPair } from '@/ui/StatPair';

import { AuctionLotCard } from './AuctionLotCard';
import { collectionActionCommand, collectionActionSheetText } from './collectionAction';
import { auctionNote } from './collectionFormat';
import { PiecesSection } from './PiecesSection';
import { SetsSection } from './SetsSection';
import { useShowpiece } from './useShowpiece';

export function CollectionScreen() {
  const view = selectCollection(useGameSnapshot(), getContent());
  const format = useMoneyFormat();
  const { confirmation, review, close, confirm } = useGameAction(collectionActionCommand);
  const { saleReturnPercent } = view;
  const show = useShowpiece();
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
      <PiecesSection
        view={view}
        onSell={(owned) => review({ kind: 'sell', owned, saleReturnPercent })}
        onShow={show}
      />
      <SetsSection sets={view.sets} />
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
