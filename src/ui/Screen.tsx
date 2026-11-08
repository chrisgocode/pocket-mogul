import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ScrollSections } from './ScrollSections';
import { useScrollSection } from './effects/useScrollSection';
import { AccentProvider } from './Accent';
import { colors, spacing, type SectionTone } from './tokens';
export function Screen({
  children,
  tone = 'profile',
  focusSection,
}: {
  children: ReactNode;
  tone?: SectionTone;
  focusSection?: string | undefined;
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
    </AccentProvider>
  );
}
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
});
