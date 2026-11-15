import { useMemo } from 'react';
import { Animated, Easing } from 'react-native';

import { useReducedMotion } from './motion';
import { motion } from './tokens';

const SETTLED = 1;

export function useTapPop() {
  const progress = useMemo(() => new Animated.Value(SETTLED), []);
  const reduced = useReducedMotion();
  const pop = () => {
    if (reduced) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: SETTLED,
      duration: motion.tapPopMs,
      easing: Easing.out((elapsed) => Easing.quad(elapsed)),
      useNativeDriver: true,
    }).start();
  };
  return { progress, pop };
}
