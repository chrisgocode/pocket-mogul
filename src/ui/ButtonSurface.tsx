import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, feedback, radius } from './tokens';

export function ButtonSurface() {
  const gradientId = useId();
  return (
    <View
      style={styles.surface}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="100%">
            <Stop
              offset="0"
              stopColor={colors.buttonHighlight}
              stopOpacity={feedback.buttonHighlightOpacity}
            />
            <Stop offset="1" stopColor={colors.buttonHighlight} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { ...StyleSheet.absoluteFill, borderRadius: radius.md, overflow: 'hidden' },
});
