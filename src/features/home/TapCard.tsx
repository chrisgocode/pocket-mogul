import { Pressable, StyleSheet } from 'react-native';

import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import { AppText } from '@/ui/Typography';
import { usePressedStyle } from '@/ui/pressFeedback';
import { colors, highlightCardWidth, radius, spacing } from '@/ui/tokens';

import { WalletDrawing } from './WalletDrawing';
import type { WalletArtwork } from './walletArtwork';

export function TapCard({
  perTapCents,
  walletLevel,
  boosted,
  artwork,
  highlight,
  onTap,
}: {
  perTapCents: MoneyCents;
  walletLevel: number;
  boosted: boolean;
  artwork: WalletArtwork;
  highlight: 'tutorial' | 'none';
  onTap: () => void;
}) {
  const payout = formatMoneyExact(perTapCents);
  const pressedStyle = usePressedStyle();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tap card, ${artwork.name}, earns ${payout} per tap${boosted ? ', boosted' : ''}`}
      onPress={onTap}
      style={({ pressed }) => [
        styles.card,

        highlight === 'tutorial' && styles.highlighted,
        pressed && pressedStyle,
      ]}
    >
      <WalletDrawing artwork={artwork} />
      <AppText variant="display" style={styles.value}>
        +{payout}
      </AppText>
      <AppText variant="caption" muted>
        per tap · wallet level {walletLevel}
        {boosted ? ' · Boosted' : ''}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 210,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  highlighted: { borderWidth: highlightCardWidth, borderColor: colors.highlight },
  value: { color: colors.highlight },
});
