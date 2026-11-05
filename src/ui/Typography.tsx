import { Text, type TextProps } from 'react-native';

import { colors, type } from './tokens';

type Variant = keyof typeof type;

export function AppText({
  variant = 'body',
  muted = false,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean }) {
  return (
    <Text
      style={[type[variant], { color: muted ? colors.textMuted : colors.text }, style]}
      {...rest}
    />
  );
}
