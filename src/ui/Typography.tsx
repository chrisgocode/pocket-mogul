import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, moneyGlowRadius, type } from './tokens';

type Variant = keyof typeof type;

const tones = StyleSheet.create({
  standard: { color: colors.text },
  muted: { color: colors.textMuted },
  money: {
    color: colors.accent,
    textShadowColor: colors.accentGlow,
    textShadowRadius: moneyGlowRadius,
  },
});

function toneFor(variant: Variant, muted: boolean) {
  if (muted) return tones.muted;
  return variant === 'display' ? tones.money : tones.standard;
}

export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean }) {
  return <Text style={[type[variant], toneFor(variant, muted), style]} {...rest} />;
}
