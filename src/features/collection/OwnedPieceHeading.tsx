import { StyleSheet, View } from 'react-native';

import type { OwnedPiece } from '@/application/collectionView';
import { spacing } from '@/ui/tokens';
import { AppText } from '@/ui/Typography';

import { CollectibleArtwork } from './CollectibleArtwork';
import { pieceKind } from './collectionFormat';

export function OwnedPieceHeading({ owned }: { owned: OwnedPiece }) {
  return (
    <View style={styles.heading}>
      <CollectibleArtwork
        pieceId={owned.piece.id}
        categoryName={owned.categoryName}
        size="thumbnail"
      />
      <View style={styles.description}>
        <AppText variant="heading">{owned.piece.name}</AppText>
        <AppText variant="caption" muted>{`${pieceKind(owned)} · ${owned.piece.note}`}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  description: { flex: 1, gap: spacing.xs },
});
