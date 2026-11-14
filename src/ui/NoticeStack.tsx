import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/ui/tokens';

export function NoticeStack({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
