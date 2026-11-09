import { StyleSheet, type ViewStyle } from 'react-native';

import { useReducedMotion } from './motion';
import { feedback } from './tokens';

const styles = StyleSheet.create({
  scaled: { transform: [{ scale: feedback.pressedScale }] },
  dimmed: { opacity: feedback.pressedOpacity },
  depressed: {
    transform: [
      { translateY: feedback.buttonPressedOffset },
      { scale: feedback.buttonPressedScale },
    ],
    shadowOpacity: 0,
  },
});

export function usePressedStyle(): ViewStyle {
  return useReducedMotion() ? styles.dimmed : styles.scaled;
}

export function useButtonPressedStyle(): ViewStyle {
  return useReducedMotion() ? styles.dimmed : styles.depressed;
}
