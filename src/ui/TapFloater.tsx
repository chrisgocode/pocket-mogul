import { Animated, StyleSheet } from 'react-native';

import { AppText } from './Typography';
import { colors, motion } from './tokens';

export function TapFloater({ progress, text }: { progress: Animated.Value; text: string }) {
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.floater,
        {
          opacity: progress.interpolate(motion.tapFade),
          transform: [{ translateY: progress.interpolate(motion.tapRise) }],
        },
      ]}
    >
      <AppText variant="title" style={styles.text}>
        {text}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floater: { position: 'absolute', top: '18%', alignSelf: 'center' },
  text: { color: colors.gain },
});
