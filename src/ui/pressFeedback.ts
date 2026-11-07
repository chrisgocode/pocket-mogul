import { StyleSheet, type ViewStyle } from 'react-native';

import { useReducedMotion } from './motion';
import { feedback } from './tokens';

const styles = StyleSheet.create({
  scaled: { transform: [{ scale: feedback.pressedScale }] },
  dimmed: { opacity: feedback.pressedOpacity },
});

export function usePressedStyle(): ViewStyle {
  return useReducedMotion() ? styles.dimmed : styles.scaled;
}
