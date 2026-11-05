import { Pressable, StyleSheet } from 'react-native';

import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import { AppText } from '@/ui/Typography';
import { colors, feedback, radius, spacing } from '@/ui/tokens';

import type { WalletArtwork } from './walletArtwork';

export function TapCard({
  perTapCents,
  walletLevel,
  artwork,
  onTap,
}: {
  perTapCents: MoneyCents;
  walletLevel: number;
  artwork: WalletArtwork;
  onTap: () => void;
}) {
  const payout = formatMoneyExact(perTapCents);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tap card, ${artwork.name}, earns ${payout} per tap`}
      onPress={onTap}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: artwork.color },
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="title" style={styles.text}>
        {artwork.name}
      </AppText>
      <AppText style={styles.text}>
        Level {walletLevel} · +{payout}
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
  pressed: { transform: [{ scale: feedback.pressedScale }] },
  text: { color: colors.textOnAccent },
});
