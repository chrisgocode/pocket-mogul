import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSheetAnimation } from './motion';
import { colors, radius, size, spacing } from './tokens';

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
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={[styles.content, bottomPadding]}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const SHEET_RADIUS = 24;

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: size.sheetHandleWidth,
    height: size.sheetHandleHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  content: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
});
