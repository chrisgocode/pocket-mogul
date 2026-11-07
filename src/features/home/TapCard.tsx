import { Pressable, StyleSheet } from 'react-native';

import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import { AppText } from '@/ui/Typography';
import { usePressedStyle } from '@/ui/pressFeedback';
import { colors, highlightCardWidth, radius, spacing } from '@/ui/tokens';

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
        { backgroundColor: artwork.color },
        highlight === 'tutorial' && styles.highlighted,
        pressed && pressedStyle,
      ]}
    >
      <AppText variant="title" style={styles.text}>
        {artwork.name}
      </AppText>
      <AppText style={styles.text}>
        Level {walletLevel} · +{payout}
        {boosted ? ' · Boosted' : ''}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 1.6,
    borderRadius: radius.lg,
    padding: spacing.xl,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  highlighted: { borderWidth: highlightCardWidth, borderColor: colors.highlight },
  text: { color: colors.textOnAccent },
});
