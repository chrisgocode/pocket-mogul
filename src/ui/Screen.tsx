import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScrollSections } from './ScrollSections';
import { useScrollSection } from './effects/useScrollSection';
import { AccentProvider } from './Accent';
import { colors, spacing, type SectionTone } from './tokens';

export function Screen({
  children,
  tone = 'profile',
  focusSection,
  footer,
}: {
  children: ReactNode;
  tone?: SectionTone;
  focusSection?: string | undefined;
  footer?: ReactNode;
}) {
  const { ref, register, onContentSizeChange } = useScrollSection(focusSection);
  return (
    <AccentProvider tone={tone}>
      <ScrollView
        ref={ref}
        onContentSizeChange={onContentSizeChange}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScrollSections register={register}>{children}</ScrollSections>
      </ScrollView>
      {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
    </AccentProvider>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  footer: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
