import { Pressable, StyleSheet } from 'react-native';

import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import { AppText } from '@/ui/Typography';
import { colors, feedback, radius, spacing } from '@/ui/tokens';

export function TapCard({
  perTapCents,
  walletLevel,
  onTap,
}: {
  perTapCents: MoneyCents;
  walletLevel: number;
  onTap: () => void;
}) {
  const payout = formatMoneyExact(perTapCents);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tap card, earns ${payout} per tap`}
      onPress={onTap}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <AppText variant="title" style={styles.text}>
        Tap card
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
    backgroundColor: colors.accent,
    padding: spacing.xl,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  pressed: { transform: [{ scale: feedback.pressedScale }] },
  text: { color: colors.textOnAccent },
});
