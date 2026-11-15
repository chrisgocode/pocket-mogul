import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import { TapFloater } from '@/ui/TapFloater';
import { AppText } from '@/ui/Typography';
import { colors, highlightCardWidth, motion, radius, size, spacing } from '@/ui/tokens';
import { useTapPop } from '@/ui/useTapPop';

import { WalletDrawing } from './WalletDrawing';
import type { WalletArtwork } from './walletArtwork';

export function TapCard({
  perTapCents,
  boosted,
  artwork,
  highlight,
  onTap,
}: {
  perTapCents: MoneyCents;
  boosted: boolean;
  artwork: WalletArtwork;
  highlight: 'tutorial' | 'none';
  onTap: () => void;
}) {
  const payout = formatMoneyExact(perTapCents);
  const { progress, pop } = useTapPop();
  const tap = () => {
    pop();
    onTap();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tap card, ${artwork.name}, earns ${payout} per tap${boosted ? ', boosted' : ''}`}
      onPress={tap}
      style={[styles.card, highlight === 'tutorial' && styles.highlighted]}
    >
      <View style={styles.glow} />
      <Animated.View style={{ transform: [{ scale: progress.interpolate(motion.tapPulse) }] }}>
        <WalletDrawing artwork={artwork} />
      </Animated.View>
      <TapFloater progress={progress} text={`+${payout}`} />
      <AppText variant="display" style={styles.value}>
        +{payout}
      </AppText>
      <AppText variant="label" muted>
        {boosted ? 'per tap · boosted' : 'per tap'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: size.walletStage + spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: highlightCardWidth,
    borderColor: colors.transparent,
  },
  highlighted: { borderColor: colors.highlight },
  glow: {
    position: 'absolute',
    width: size.walletStage,
    height: size.walletStage,
    borderRadius: radius.pill,
    backgroundColor: colors.stageGlow,
  },
  value: { color: colors.highlight },
});
