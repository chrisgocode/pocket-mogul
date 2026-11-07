import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetAnimation } from './motion';
import { colors, radius, spacing } from './tokens';

export function BottomSheet({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = { paddingBottom: Math.max(insets.bottom, spacing.xl) };
  return (
    <Modal
      visible={visible}
      transparent
      animationType={useSheetAnimation()}
      onRequestClose={onRequestClose}
    >
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={[styles.content, bottomPadding]}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
  },
  content: { padding: spacing.xl, gap: spacing.md },
});
